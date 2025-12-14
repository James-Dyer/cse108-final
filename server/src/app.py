from datetime import datetime, timedelta
import json
from functools import wraps
import os
from typing import List, Optional

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy import inspect, text
import jwt
from openai import OpenAI


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

OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
client = OpenAI()

DEFAULT_SAMPLE_CODE = """# Write Python here

def main():
    sample = [1, 2, 3]
    doubled = [x * 2 for x in sample]
    print("Doubled values:", doubled)

if __name__ == "__main__":
    main()
"""

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
    activity_map = db.Column(db.Text, default="{}")
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
    code = db.Column(db.Text, default="", nullable=False)
    max_stage_unlocked = db.Column(db.Integer, default=0, nullable=False)
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
    objectives = db.relationship(
        "LearningObjective",
        backref="assignment",
        order_by="LearningObjective.order_index",
        cascade="all, delete-orphan",
    )

    def to_dict(
        self, include_steps: bool = False, include_objectives: bool = False
    ) -> dict:
        payload = {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "raw_instructions": self.raw_instructions,
            "language": self.language,
            "code": self.code,
            "max_stage_unlocked": self.max_stage_unlocked,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if include_steps:
            payload["steps"] = [step.to_dict() for step in self.steps]
        if include_objectives:
            payload["learning_objectives"] = [
                objective.to_dict() for objective in self.objectives
            ]
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


class LearningObjective(db.Model):
    __tablename__ = "learning_objectives"

    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(
        db.Integer, db.ForeignKey("assignments.id"), nullable=False
    )
    title = db.Column(db.String(255), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    why_it_matters = db.Column(db.Text, default="", nullable=False)
    used_in_this_assignment = db.Column(db.Text, default="", nullable=False)
    order_index = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "assignment_id": self.assignment_id,
            "title": self.title,
            "summary": self.summary,
            "why_it_matters": self.why_it_matters,
            "used_in_this_assignment": self.used_in_this_assignment,
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


def build_learning_objectives(raw_instructions: str) -> List[dict]:
    """Deterministic fall-back objectives for when LLM is unavailable."""
    headline = (raw_instructions.strip().split("\n")[0] or "This assignment")[:80]
    return [
        {
            "title": "Clarify the goal",
            "summary": f"Rewrite the brief in your own words. Key line: {headline}",
            "why_it_matters": "Ensures you solve the intended problem and avoid rework.",
            "used_in_this_assignment": "Sets the scope for your plan and tests.",
            "order_index": 0,
        },
        {
            "title": "Testing mindset",
            "summary": "List a happy-path and edge-case test before coding.",
            "why_it_matters": "Catches misunderstandings early.",
            "used_in_this_assignment": "Guides how you validate each step.",
            "order_index": 1,
        },
        {
            "title": "Decompose the work",
            "summary": "Break the problem into smaller functions or phases.",
            "why_it_matters": "Keeps code modular and easier to debug.",
            "used_in_this_assignment": "Informs your step plan and function boundaries.",
            "order_index": 2,
        },
    ]


def serialize_assignment(assignment: Assignment) -> dict:
    return assignment.to_dict(include_steps=True, include_objectives=True)


def generate_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(minutes=app.config["JWT_TTL_MINUTES"]),
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
            payload = jwt.decode(token, app.config["JWT_SECRET"], algorithms=["HS256"])
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


def parse_activity_map(user: User) -> dict:
    raw = user.activity_map or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    if not isinstance(data, dict):
        return {}
    cleaned = {}
    for key, value in data.items():
        if isinstance(key, str):
            cleaned[key] = bool(value)
    return cleaned


def save_activity_map(user: User, activity: dict) -> dict:
    user.activity_map = json.dumps(activity, sort_keys=True)
    user.updated_at = datetime.utcnow()
    db.session.commit()
    return activity


def normalize_date_string(date_str: str) -> Optional[str]:
    try:
        parsed = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return None
    return parsed.date().isoformat()


def ensure_today_marked(user: User) -> dict:
    activity = parse_activity_map(user)
    today = datetime.utcnow().date().isoformat()
    if not activity.get(today):
        activity[today] = True
        save_activity_map(user, activity)
    return activity


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


@app.route("/api/activity", methods=["GET"])
@require_auth
def get_activity():
    activity = ensure_today_marked(g.current_user)
    return jsonify({"activity": activity})


@app.route("/api/activity", methods=["PATCH"])
@require_auth
def update_activity():
    data = request.get_json() or {}
    date_str = (data.get("date") or "").strip()
    active = data.get("active")

    if not date_str:
        return jsonify({"error": "date is required."}), 400

    normalized_date = normalize_date_string(date_str)
    if not normalized_date:
        return jsonify({"error": "date must be YYYY-MM-DD."}), 400

    if not isinstance(active, bool):
        return jsonify({"error": "active must be a boolean."}), 400

    activity = parse_activity_map(g.current_user)
    if active:
        activity[normalized_date] = True
    else:
        activity.pop(normalized_date, None)

    save_activity_map(g.current_user, activity)
    return jsonify({"activity": activity})


@app.route("/api/assignments", methods=["GET"])
@require_auth
def list_assignments():
    assignments = (
        Assignment.query.filter_by(user_id=g.current_user.id)
        .order_by(Assignment.created_at.desc())
        .all()
    )
    return jsonify(
        {
            "assignments": [
                a.to_dict(include_steps=True, include_objectives=True)
                for a in assignments
            ]
        }
    )


@app.route("/api/assignments", methods=["POST"])
@require_auth
def create_assignment():
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    instructions = (data.get("raw_instructions") or "").strip()
    language = (data.get("language") or "python").strip().lower()
    max_stage_unlocked = 0

    if not title:
        return jsonify({"error": "Title is required."}), 400
    if len(title) > 255:
        return jsonify({"error": "Title must be 255 characters or fewer."}), 400
    if not instructions:
        return jsonify({"error": "Instructions are required."}), 400
    if len(instructions) > 20000:
        return jsonify({"error": "Instructions are too long for storage."}), 400
    if language not in {"python"}:
        return jsonify({"error": "Unsupported language for MVP."}), 400

    assignment = Assignment(
        user_id=g.current_user.id,
        title=title,
        raw_instructions=instructions,
        language=language or "python",
        code=DEFAULT_SAMPLE_CODE,
        max_stage_unlocked=max_stage_unlocked,
    )

    for idx, step in enumerate(build_step_plan(instructions, assignment.language)):
        assignment.steps.append(
            Step(
                title=step["title"],
                description=step["description"],
                order_index=idx,
            )
        )

    for idx, objective in enumerate(build_learning_objectives(instructions)):
        assignment.objectives.append(
            LearningObjective(
                title=objective.get("title", "")[:255],
                summary=objective.get("summary", ""),
                why_it_matters=objective.get("why_it_matters", ""),
                used_in_this_assignment=objective.get("used_in_this_assignment", ""),
                order_index=objective.get("order_index", idx),
            )
        )

    db.session.add(assignment)
    db.session.commit()

    return jsonify({"assignment": serialize_assignment(assignment)}), 201


def get_assignment_or_404(assignment_id: int) -> Optional[Assignment]:
    return Assignment.query.filter_by(id=assignment_id).first()


# Ingest raw assignment instructions and output an assignment overview. Triggered when the assignment is first created.
def generate_assignmnet_overview(raw_instructions: str) -> str:
    prompt = f"""
        Generate a student-facing assignment overview.
        Do not include any introductory or meta sentences (e.g., “This assignment requires…”, “In this assignment…”, or explanations of what the assignment is).
        Do not include any headers.
        Begin the output starting with the summary.

        If applicable, include:
        - A brief summary (1–2 sentences)
        - A requirements list
        - An example
        - Any necessary notes

        Assignment instructions:
        {raw_instructions}

        Rules:
        - Maximum 200 words
        - No title or headers
        - Output only the assignment content
    """
    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            input=prompt,
            max_output_tokens=320,
            temperature=0.2,
        )
        text = (response.output_text or "").strip()
        if not text:
            raise RuntimeError("LLM returned empty output.")
        return text

    except Exception as exc:
        app.logger.error("LLM overview generation failed", exc_info=exc)
        raise RuntimeError("Assignment overview generation failed.") from exc


def generate_assignment_learning_objectives(raw_instructions: str) -> str:
    prompt = f"""
        Given instructions for an assignment, generate a deterministic JSON object containing a list of Learning Objectives.
        Each learning objective represents a core skill or idea the student will practice while completing the assignment.

        For each learning objective, include:
        - title: a short, human-readable name
        - summary: a one-sentence explanation of the concept
        - why_it_matters: a one-sentence explanation of its general importance
        - used_in_this_assignment: a one-sentence description of where the concept appears in this assignment

        Assignment Instructions:
        {raw_instructions}

        Rules:
        - Do not include implementation steps, code, or instructions.
        - Output must be valid JSON and nothing else.
    """
    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            input=prompt,
            max_output_tokens=480,
            temperature=0.25,
        )
        text = (response.output_text or "").strip()
        if not text:
            raise RuntimeError("LLM returned empty output.")
        return text

    except Exception as exc:
        app.logger.error("LLM learning objective generation failed", exc_info=exc)
        raise RuntimeError("Learning objective generation failed.") from exc


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

    if not isinstance(steps_data, list):
        return jsonify({"error": "Steps payload must be a list."}), 400

    validated_steps = []
    for idx, step in enumerate(steps_data):
        title = (step.get("title") or "").strip()
        description = (step.get("description") or "").strip()
        order_index = step.get("order_index", idx)
        try:
            order_index = int(order_index)
        except (TypeError, ValueError):
            return jsonify({"error": f"Invalid order_index at step {idx}."}), 400
        if not title:
            return jsonify({"error": f"Step {idx + 1} title is required."}), 400
        if len(title) > 255:
            return jsonify({"error": f"Step {idx + 1} title too long."}), 400
        if not description:
            return jsonify({"error": f"Step {idx + 1} description is required."}), 400
        validated_steps.append(
            {
                "title": title,
                "description": description,
                "order_index": order_index,
            }
        )

    assignment.steps.clear()

    source_steps = validated_steps or build_step_plan(
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


@app.route("/api/assignments/<int:assignment_id>/objectives", methods=["POST"])
@require_auth
def replace_objectives(assignment_id: int):
    assignment = get_assignment_or_404(assignment_id)
    if not assignment or assignment.user_id != g.current_user.id:
        return jsonify({"error": "Assignment not found."}), 404

    data = request.get_json() or {}
    objectives_data = data.get("learning_objectives") or []

    if not isinstance(objectives_data, list):
        return jsonify({"error": "learning_objectives payload must be a list."}), 400

    validated_objectives = []
    for idx, objective in enumerate(objectives_data):
        title = (objective.get("title") or "").strip()
        summary = (objective.get("summary") or "").strip()
        why_it_matters = (objective.get("why_it_matters") or "").strip()
        used = (objective.get("used_in_this_assignment") or "").strip()
        order_index = objective.get("order_index", idx)
        try:
            order_index = int(order_index)
        except (TypeError, ValueError):
            return (
                jsonify({"error": f"Invalid order_index at learning objective {idx}."}),
                400,
            )
        if not title:
            return (
                jsonify({"error": f"Learning objective {idx + 1} title is required."}),
                400,
            )
        if len(title) > 255:
            return (
                jsonify({"error": f"Learning objective {idx + 1} title too long."}),
                400,
            )
        if not summary:
            return (
                jsonify(
                    {"error": f"Learning objective {idx + 1} summary is required."}
                ),
                400,
            )
        validated_objectives.append(
            {
                "title": title,
                "summary": summary,
                "why_it_matters": why_it_matters,
                "used_in_this_assignment": used,
                "order_index": order_index,
            }
        )

    assignment.objectives.clear()

    source_objectives = validated_objectives or build_learning_objectives(
        assignment.raw_instructions
    )
    for idx, objective in enumerate(source_objectives):
        assignment.objectives.append(
            LearningObjective(
                title=objective.get("title", "")[:255],
                summary=objective.get("summary", ""),
                why_it_matters=objective.get("why_it_matters", ""),
                used_in_this_assignment=objective.get("used_in_this_assignment", ""),
                order_index=objective.get("order_index", idx),
            )
        )

    db.session.commit()
    return jsonify({"assignment": serialize_assignment(assignment)})


@app.route("/api/assignments/<int:assignment_id>/code", methods=["PATCH"])
@require_auth
def update_assignment_code(assignment_id: int):
    assignment = get_assignment_or_404(assignment_id)
    if not assignment or assignment.user_id != g.current_user.id:
        return jsonify({"error": "Assignment not found."}), 404

    data = request.get_json() or {}
    if "code" not in data:
        return jsonify({"error": "Code content is required."}), 400

    code = data.get("code")
    if not isinstance(code, str):
        return jsonify({"error": "Code must be a string."}), 400
    if len(code) > 200000:
        return jsonify({"error": "Code is too long for storage."}), 400

    assignment.code = code
    db.session.commit()
    return jsonify({"assignment": serialize_assignment(assignment)})


@app.route("/api/assignments/<int:assignment_id>/progress", methods=["PATCH"])
@require_auth
def update_assignment_progress(assignment_id: int):
    assignment = get_assignment_or_404(assignment_id)
    if not assignment or assignment.user_id != g.current_user.id:
        return jsonify({"error": "Assignment not found."}), 404

    data = request.get_json() or {}
    if "max_stage_unlocked" not in data:
        return jsonify({"error": "max_stage_unlocked is required."}), 400

    try:
        max_stage_unlocked = int(data.get("max_stage_unlocked", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "max_stage_unlocked must be an integer."}), 400

    if max_stage_unlocked < 0 or max_stage_unlocked > 3:
        return jsonify({"error": "max_stage_unlocked must be between 0 and 3."}), 400

    # Avoid lowering progress.
    assignment.max_stage_unlocked = max(
        assignment.max_stage_unlocked or 0, max_stage_unlocked
    )
    db.session.commit()
    return jsonify({"assignment": serialize_assignment(assignment)})


def ensure_assignment_schema():
    inspector = inspect(db.engine)
    columns = [col["name"] for col in inspector.get_columns("assignments")]
    if "code" not in columns:
        with db.engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE assignments ADD COLUMN code TEXT DEFAULT ''")
            )
            conn.execute(
                text("UPDATE assignments SET code = :default_code"),
                {"default_code": DEFAULT_SAMPLE_CODE},
            )
    if "max_stage_unlocked" not in columns:
        with db.engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE assignments ADD COLUMN max_stage_unlocked INTEGER NOT NULL DEFAULT 0"
                )
            )
            conn.execute(
                text(
                    "UPDATE assignments SET max_stage_unlocked = 0 WHERE max_stage_unlocked IS NULL"
                )
            )


def ensure_user_activity_schema():
    inspector = inspect(db.engine)
    columns = [col["name"] for col in inspector.get_columns("users")]
    if "activity_map" not in columns:
        with db.engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN activity_map TEXT DEFAULT '{}'")
            )
            conn.execute(
                text("UPDATE users SET activity_map = '{}' WHERE activity_map IS NULL")
            )


with app.app_context():
    db.create_all()
    ensure_user_activity_schema()
    ensure_assignment_schema()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
