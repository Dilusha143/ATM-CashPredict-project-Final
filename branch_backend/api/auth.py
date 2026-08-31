"""
branch_backend/api/auth.py
============================
Firebase-based authentication module with SHA-256 password hashing.

Features:
  1. Passwords stored in Firebase with SHA-256 hashing + salt
  2. Flask session management — UserID stored in session after login
  3. Password verification: hash incoming password with stored salt and compare
  4. Login logging: Stores login details in Firebase with timestamp
  5. Rate-limited login attempts (configured in app.py via Flask-Limiter)
"""
import os
import time
import secrets
import hashlib
import functools
from flask import request, jsonify, session
from branch_backend.config.firebase_config import get_firebase_db

# ── Initialize Firebase DB ───────────────────────────────────
firebase_db = get_firebase_db()


def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    """
    Hash a password using SHA-256 with salt.
    
    Args:
        password: Plain text password
        salt: Existing salt (if verifying), or None to generate new salt
    
    Returns:
        Tuple of (password_hash, salt)
    """
    if salt is None:
        salt = secrets.token_hex(16)  # Generate random 32-char hex salt
    
    # Combine password and salt, hash with SHA-256
    hash_input = f"{password}{salt}".encode('utf-8')
    password_hash = hashlib.sha256(hash_input).hexdigest()
    
    return password_hash, salt


def verify_password(username: str, password: str) -> dict | None:
    """
    Verify username and password against Firebase.
    
    Args:
        username: Login username
        password: Plain text password
    
    Returns:
        User dict if credentials match, None if not found or password wrong
    """
    user_data = firebase_db.get_user(username)
    
    if user_data is None:
        return None  # User not found
    
    if not user_data.get("is_active", False):
        return None  # User account is inactive
    
    # Re-hash password with stored salt and compare
    stored_hash = user_data.get("password_hash")
    stored_salt = user_data.get("password_salt")
    
    if not stored_hash or not stored_salt:
        return None  # Incomplete user data
    
    incoming_hash, _ = hash_password(password, stored_salt)
    
    if incoming_hash != stored_hash:
        return None  # Password mismatch
    
    return user_data


def login_user(username: str, password: str, ip_address: str = None) -> dict:
    """
    Authenticate user and create session.
    
    Args:
        username: Login username
        password: Plain text password
        ip_address: Optional client IP address
    
    Returns:
        {"success": bool, "message": str, "user_id": str (if successful)}
    """
    user_data = verify_password(username, password)
    
    login_time = int(time.time())
    
    if user_data is None:
        # Log failed attempt
        firebase_db.log_login(username, login_time, status="failed", 
                             ip_address=ip_address)
        return {
            "success": False,
            "message": "Invalid username or password"
        }
    
    # Log successful login
    firebase_db.log_login(username, login_time, status="success", 
                         ip_address=ip_address)
    
    # Create Flask session with UserID
    session["user_id"] = username
    session["login_time"] = login_time
    session.permanent = True
    
    return {
        "success": True,
        "message": "Login successful",
        "user_id": username
    }


def logout_user() -> None:
    """Clear user session."""
    session.clear()


def create_user_in_firebase(username: str, password: str) -> dict:
    """
    Create new user in Firebase with hashed password.
    (Admin-only operation - should be called from admin interface)
    
    Args:
        username: New username
        password: Plain text password
    
    Returns:
        {"success": bool, "message": str}
    """
    if firebase_db.user_exists(username):
        return {
            "success": False,
            "message": "Username already exists"
        }
    
    password_hash, salt = hash_password(password)
    
    if firebase_db.create_user(username, password_hash, salt):
        return {
            "success": True,
            "message": f"User {username} created successfully"
        }
    else:
        return {
            "success": False,
            "message": "Error creating user in Firebase"
        }


def require_login(f):
    """
    Decorator to require user to be logged in.
    Checks if user_id is in Flask session.
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Not logged in"}), 401
        return f(*args, **kwargs)
    return decorated_function
