from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Verify API key is set
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable not set. Please set it in .env file or system environment.")

from server.database import init_db, add_user, verify_user, get_user, seed_default_users
from wrapper import get_tutor_hint
app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    created_at: str
    
    class Config:
        arbitrary_types_allowed = True
class TutorRequest(BaseModel):
    assignment: str
    student_code: str
    question: str


# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()
    # Seed default users only on first run
    try:
        seed_default_users()
    except:
        pass  # Users already exist

@app.get("/")
def root():
    return {"message": "CodeMentor API is running"}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    """Authenticate user and return user info"""
    if not verify_user(req.username, req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    user = get_user(req.username)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "success": True,
        "user": user
    }

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    """Register a new user"""
    if req.role not in ['teacher', 'student']:
        raise HTTPException(status_code=400, detail="Role must be 'teacher' or 'student'")
    
    if not add_user(req.username, req.password, req.role):
        raise HTTPException(status_code=409, detail="Username already exists")
    
    user = get_user(req.username)
    if user is None:
        raise HTTPException(status_code=500, detail="User registration succeeded but could not retrieve user data")
    
    return {
        "success": True,
        "user": user
    }

@app.get("/api/user/{username}")
def get_user_info(username: str):
    """Get user information"""
    user = get_user(username)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
@app.post("/api/tutor/hint")
def tutor_hint(req: TutorRequest):
    hint = get_tutor_hint(
        req.assignment,
        req.student_code,
        req.question
    )

    return {"hint": hint}

