"""
branch_backend/api/auth_routes.py
==================================
Firebase-based authentication API routes.
Handles login, logout, registration (admin), and login history.
"""
from flask import Blueprint, request, jsonify, session
from branch_backend.api.auth import (
    login_user, logout_user, create_user_in_firebase, require_login,
    firebase_db
)

auth_api = Blueprint("auth_api", __name__)


@auth_api.route("/login", methods=["POST", "OPTIONS"])
def login():
    """
    Login endpoint - Firebase credential verification + session creation.
    
    Request JSON:
        - username: string (required)
        - password: string (required)
    
    Returns:
        - success: bool
        - message: string
        - user_id: string (if successful)
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200
    
    try:
        data = request.get_json() or {}
        username = (data.get("username") or "").strip().lower()
        password = data.get("password") or ""
        
        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
        
        # Get client IP address (for logging)
        ip_address = request.remote_addr or request.headers.get('X-Forwarded-For')
        
        # Authenticate with Firebase
        result = login_user(username, password, ip_address=ip_address)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 401
    
    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500


@auth_api.route("/logout", methods=["POST", "OPTIONS"])
def logout():
    """
    Logout endpoint - Clear Flask session.
    
    Returns:
        - message: string
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200
    
    try:
        logout_user()
        return jsonify({"message": "Logged out successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Logout failed: {str(e)}"}), 500


@auth_api.route("/me", methods=["GET", "OPTIONS"])
@require_login
def get_current_user():
    """
    Get current logged-in user info from session.
    
    Returns:
        - user_id: string
        - login_time: timestamp
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200
    
    return jsonify({
        "user_id": session.get("user_id"),
        "login_time": session.get("login_time")
    }), 200


@auth_api.route("/register", methods=["POST", "OPTIONS"])
def register():
    """
    Create new user (admin-only operation).
    
    Request JSON:
        - username: string (required)
        - password: string (required)
        - admin_password: string (for authorization - should match Flask admin key)
    
    Returns:
        - success: bool
        - message: string
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200
    
    try:
        data = request.get_json() or {}
        username = (data.get("username") or "").strip().lower()
        password = data.get("password") or ""
        admin_password = data.get("admin_password") or ""
        
        # Simple admin authorization check
        # TODO: Replace with proper admin-only check
        if admin_password != "admin_secret_key":
            return jsonify({"error": "Not authorized"}), 403
        
        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
        
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        result = create_user_in_firebase(username, password)
        
        if result["success"]:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
    
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


@auth_api.route("/login-history", methods=["GET", "OPTIONS"])
@require_login
def login_history():
    """
    Get login history for current user.
    
    Returns:
        - login_logs: dict of timestamp -> log entry
    """
    if request.method == "OPTIONS":
        return jsonify({}), 200
    
    try:
        username = session.get("user_id")
        logs = firebase_db.get_login_logs(username)
        
        return jsonify({
            "user_id": username,
            "login_logs": logs or {}
        }), 200
    
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve logs: {str(e)}"}), 500


@auth_api.route("/health", methods=["GET"])
def health_check():
    """
    Simple health check endpoint.
    """
    return jsonify({"status": "ok", "service": "auth"}), 200
