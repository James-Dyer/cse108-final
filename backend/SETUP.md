# CodeMentor - Setup Instructions

## Project Structure
- **Frontend**: React + Vite + TypeScript in `frontend/`
- **Backend**: FastAPI in `server/`
- **Database**: SQLite with hashed passwords

## Backend Setup

### 1. Install Dependencies
```bash
cd server
pip install -r requirements.txt
```

### 2. Initialize Database
```bash
cd server
python src/database.py
```

This will create a SQLite database (`users.db`) with default users:
- **Teacher**: username: `teacher1`, password: `password123`
- **Teacher**: username: `teacher2`, password: `teacher789`
- **Student**: username: `student1`, password: `password123`
- **Student**: username: `student2`, password: `student456`

### 3. Run the Backend Server
```bash
cd server
uvicorn src.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### API Endpoints

#### POST `/api/auth/login`
Login with username and password
```json
{
  "username": "teacher1",
  "password": "password123"
}
```

#### POST `/api/auth/register`
Register a new user
```json
{
  "username": "newuser",
  "password": "password123",
  "role": "student"
}
```

#### GET `/api/user/{username}`
Get user information

#### GET `/api/health`
Check if API is running

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Run Development Server
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 3. Features
- Login/Register page with hashed password authentication
- Role-based routing (Teacher/Student)
- User data stored in localStorage after login
- Demo credentials provided on login page

## Database Schema

### Users Table
```
id: INTEGER PRIMARY KEY AUTOINCREMENT
username: TEXT UNIQUE NOT NULL
password_hash: TEXT NOT NULL
role: TEXT ('teacher' or 'student')
created_at: TIMESTAMP
```

All passwords are hashed using werkzeug's `generate_password_hash()` and verified with `check_password_hash()`.

## Notes
- CORS is enabled in the backend for frontend communication
- Passwords are never stored in plain text
- User data persists in SQLite database
- Frontend communicates with backend via axios HTTP requests
