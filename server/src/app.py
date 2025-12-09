from datetime import datetime, timedelta
from functools import wraps
import os
from typing import List, Optional

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash
import jwt


load_dotenv()

app = Flask(__name__)
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5173/",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5173/",
]
env_origins = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [
    origin.strip() for origin in env_origins.split(",") if origin.strip()
] or DEFAULT_ALLOWED_ORIGINS

db_path = os.path.join(os.path.dirname(__file__), "code_lab.db")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET"] = os.environ.get("JWT_SECRET", "dev-secret-change-me")
app.config["JWT_TTL_MINUTES"] = int(os.environ.get("JWT_TTL_MINUTES", "1440"))

db = SQLAlchemy(app)
CORS(
    app,
    resources={r"/api/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)


@app.before_request
def handle_preflight():
    # Short-circuit CORS preflight without hitting any auth logic.
    if request.method == "OPTIONS":
        return app.make_default_options_response()


@app.route("/api/<path:_>", methods=["OPTIONS"])
def catch_all_options(_: str):
    # Ensure every API endpoint responds to OPTIONS.
    return app.make_default_options_response()


@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = request.headers.get(
            "Access-Control-Request-Headers", "Content-Type"
        )
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        )
    return response


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    assignments = db.relationship(
        "Assignment", backref="user", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Assignment(db.Model):
    __tablename__ = "assignments"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    raw_instructions = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(64), default="python", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    steps = db.relationship(
        "Step",
        backref="assignment",
        order_by="Step.order_index",
        cascade="all, delete-orphan",
    )

    def to_dict(self, include_steps: bool = False) -> dict:
        payload = {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "raw_instructions": self.raw_instructions,
            "language": self.language,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if include_steps:
            payload["steps"] = [step.to_dict() for step in self.steps]
        return payload


class Step(db.Model):
    __tablename__ = "steps"

    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(
        db.Integer, db.ForeignKey("assignments.id"), nullable=False
    )
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    order_index = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "assignment_id": self.assignment_id,
            "title": self.title,
            "description": self.description,
            "order_index": self.order_index,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


def build_step_plan(raw_instructions: str, language: str) -> List[dict]:
    """Deterministic fall-back for plan generation in lieu of an LLM."""
    trimmed = raw_instructions.strip()
    headline = trimmed.split("\n")[0][:80] if trimmed else "Coding task"
    return [
        {
            "title": "Clarify the problem",
            "description": f"Restate the goal in your own words. Key line: {headline}",
        },
        {
            "title": "Design a solution",
            "description": "Sketch the algorithm and data structures. Write quick pseudocode.",
        },
        {
            "title": f"Implement in {language}",
            "description": "Translate the plan into code. Keep functions small and testable.",
        },
        {
            "title": "Self-check and refine",
            "description": "Walk through inputs, edge cases, and clean up naming/comments.",
        },
    ]


def serialize_assignment(assignment: Assignment) -> dict:
    return assignment.to_dict(include_steps=True)


def generate_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "exp": datetime.utcnow()
        + timedelta(minutes=app.config["JWT_TTL_MINUTES"]),
    }
    return jwt.encode(payload, app.config["JWT_SECRET"], algorithm="HS256")


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization header missing"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(
                token, app.config["JWT_SECRET"], algorithms=["HS256"]
            )
            user_id = payload.get("sub")
            try:
                user_id = int(user_id)
            except (TypeError, ValueError):
                raise jwt.InvalidTokenError("Invalid subject")

            user = User.query.filter_by(id=user_id).first()
            if not user:
                raise jwt.InvalidTokenError("User not found")
            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return fn(*args, **kwargs)

    return wrapper


@app.route("/api/health", methods=["GET"])
def healthcheck():
    return jsonify({"status": "ok"})


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Account already exists."}), 409

    user = User(email=email, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()

    token = generate_token(user)
    return jsonify({"user": user.to_dict(), "token": token})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials."}), 401

    token = generate_token(user)
    return jsonify({"user": user.to_dict(), "token": token})


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def current_user():
    return jsonify({"user": g.current_user.to_dict()})


@app.route("/api/assignments", methods=["GET"])
@require_auth
def list_assignments():
    assignments = (
        Assignment.query.filter_by(user_id=g.current_user.id)
        .order_by(Assignment.created_at.desc())
        .all()
    )
    return jsonify(
        {"assignments": [a.to_dict(include_steps=True) for a in assignments]}
    )


@app.route("/api/assignments", methods=["POST"])
@require_auth
def create_assignment():
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    instructions = (data.get("raw_instructions") or "").strip()
    language = (data.get("language") or "python").strip().lower()

    if not title or not instructions:
        return (
            jsonify({"error": "title and raw_instructions are required."}),
            400,
        )

    assignment = Assignment(
        user_id=g.current_user.id,
        title=title,
        raw_instructions=instructions,
        language=language or "python",
    )

    for idx, step in enumerate(build_step_plan(instructions, assignment.language)):
        assignment.steps.append(
            Step(
                title=step["title"],
                description=step["description"],
                order_index=idx,
            )
        )

    db.session.add(assignment)
    db.session.commit()

    return jsonify({"assignment": serialize_assignment(assignment)}), 201


def get_assignment_or_404(assignment_id: int) -> Optional[Assignment]:
    return Assignment.query.filter_by(id=assignment_id).first()


@app.route("/api/assignments/<int:assignment_id>", methods=["GET"])
@require_auth
def retrieve_assignment(assignment_id: int):
    assignment = get_assignment_or_404(assignment_id)
    if not assignment or assignment.user_id != g.current_user.id:
        return jsonify({"error": "Assignment not found."}), 404
    return jsonify({"assignment": serialize_assignment(assignment)})


@app.route("/api/assignments/<int:assignment_id>", methods=["DELETE"])
@require_auth
def delete_assignment(assignment_id: int):
    assignment = get_assignment_or_404(assignment_id)
    if not assignment or assignment.user_id != g.current_user.id:
        return jsonify({"error": "Assignment not found."}), 404

    db.session.delete(assignment)
    db.session.commit()
    return jsonify({"status": "deleted"})


@app.route("/api/assignments/<int:assignment_id>/steps", methods=["POST"])
@require_auth
def replace_steps(assignment_id: int):
    assignment = get_assignment_or_404(assignment_id)
    if not assignment or assignment.user_id != g.current_user.id:
        return jsonify({"error": "Assignment not found."}), 404

    data = request.get_json() or {}
    steps_data = data.get("steps") or []

    assignment.steps.clear()

    source_steps = steps_data or build_step_plan(
        assignment.raw_instructions, assignment.language
    )
    for idx, step in enumerate(source_steps):
        assignment.steps.append(
            Step(
                title=step.get("title") or f"Step {idx + 1}",
                description=step.get("description") or "",
                order_index=step.get("order_index", idx),
            )
        )

    db.session.commit()
    return jsonify({"assignment": serialize_assignment(assignment)})


with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
