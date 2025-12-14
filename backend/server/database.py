import sqlite3
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import os

DATABASE_PATH = os.path.join(os.path.dirname(__file__), '..', 'users.db')

def init_db():
    """Initialize the database with users table"""
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('teacher', 'student')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    conn.commit()
    conn.close()

def add_user(username: str, password: str, role: str):
    """Add a new user with hashed password"""
    password_hash = generate_password_hash(password)
    
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    
    try:
        c.execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                  (username, password_hash, role))
        conn.commit()
        print(f"Successfully added user: {username}")
        return True
    except sqlite3.IntegrityError as e:
        print(f"IntegrityError adding user {username}: {e}")
        return False
    except Exception as e:
        print(f"Error adding user {username}: {e}")
        return False
    finally:
        conn.close()

def verify_user(username: str, password: str) -> bool:
    """Verify username and password"""
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    
    c.execute('SELECT password_hash FROM users WHERE username = ?', (username,))
    result = c.fetchone()
    conn.close()
    
    if result is None:
        return False
    
    return check_password_hash(result[0], password)

def get_user(username: str):
    """Get user info by username"""
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    
    c.execute('SELECT id, username, role, created_at FROM users WHERE username = ?', (username,))
    result = c.fetchone()
    conn.close()
    
    if result:
        return {
            'id': result[0],
            'username': result[1],
            'role': result[2],
            'created_at': result[3]
        }
    return None

def seed_default_users():
    """Seed the database with default users for testing"""
    init_db()
    
    default_users = [
        ('teacher1', 'password123', 'teacher'),
        ('student1', 'password123', 'student'),
        ('student2', 'student456', 'student'),
        ('teacher2', 'teacher789', 'teacher'),
    ]
    
    for username, password, role in default_users:
        add_user(username, password, role)
    
    print("Database seeded with default users")

if __name__ == '__main__':
    seed_default_users()
