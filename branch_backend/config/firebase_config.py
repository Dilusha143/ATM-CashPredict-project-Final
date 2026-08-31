"""
branch_backend/config/firebase_config.py
=========================================
Firebase Realtime Database configuration and initialization.
Handles connection to Firebase and user data operations.

Database Structure:
  /users/{username}
    - username: string
    - password_hash: string (SHA-256 with salt)
    - password_salt: string
    - created_at: timestamp
    - is_active: boolean

  /login_logs/{username}/{timestamp}
    - login_time: timestamp
    - user_id: string
    - status: "success" | "failed"
    - ip_address: string (optional)
"""
import os
import firebase_admin
from firebase_admin import credentials, db
from pathlib import Path

# ── Firebase initialization ──────────────────────────────────
# Allow overriding via env var (recommended); falls back to the default
# in-project path for local/demo use.
SERVICE_ACCOUNT_PATH = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH") or os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "serviceAccountKey.json"
)

FIREBASE_DATABASE_URL = "https://atmcashauth-default-rtdb.firebaseio.com"

def init_firebase():
    """
    Initialize Firebase Admin SDK.
    Call this once in app startup (app.py) or before any Firebase DB usage.
    """
    if not firebase_admin._apps:
        if not os.path.exists(SERVICE_ACCOUNT_PATH):
            raise FileNotFoundError(
                "\n\n"
                "==================================================================\n"
                "FIREBASE KEY NOT FOUND\n"
                "==================================================================\n"
                f"Expected to find it at:\n  {SERVICE_ACCOUNT_PATH}\n\n"
                "This usually means one of two things:\n"
                "  1. You haven't downloaded a service account key yet.\n"
                "     -> Firebase Console > Project Settings > Service Accounts\n"
                "        > Generate new private key\n"
                "  2. You re-extracted/re-copied the project folder AFTER placing\n"
                "     the key, which overwrote it. Re-copy the key file into\n"
                "     branch_backend/ and try again.\n\n"
                "The file must be named exactly 'serviceAccountKey.json' and sit\n"
                "directly inside branch_backend/ (next to app.py) -- or set the\n"
                "FIREBASE_SERVICE_ACCOUNT_PATH environment variable to point at it\n"
                "from anywhere else on disk.\n"
                "==================================================================\n"
            )
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred, {
            "databaseURL": FIREBASE_DATABASE_URL
        })
    return db.reference()


class FirebaseUserDB:
    """Handle all user-related Firebase operations."""
    
    def __init__(self):
        self.db_ref = init_firebase()
        self.users_ref = self.db_ref.child("users")
        self.logs_ref = self.db_ref.child("login_logs")
    
    def user_exists(self, username: str) -> bool:
        """Check if user exists in Firebase."""
        user_data = self.users_ref.child(username).get()
        return user_data is not None
    
    def get_user(self, username: str) -> dict | None:
        """Retrieve user data from Firebase."""
        user_data = self.users_ref.child(username).get()
        if user_data is None:
            return None
        return user_data
    
    def create_user(self, username: str, password_hash: str, password_salt: str) -> bool:
        """
        Create new user in Firebase.
        
        Args:
            username: Login username
            password_hash: SHA-256 hashed password
            password_salt: Salt used in hashing
        
        Returns:
            True if successful, False otherwise
        """
        try:
            import time
            user_data = {
                "username": username,
                "password_hash": password_hash,
                "password_salt": password_salt,
                "created_at": int(time.time()),
                "is_active": True
            }
            self.users_ref.child(username).set(user_data)
            return True
        except Exception as e:
            print(f"Error creating user: {e}")
            return False
    
    def log_login(self, username: str, login_time: int, status: str = "success", 
                  ip_address: str = None) -> bool:
        """
        Log login attempt to Firebase.
        
        Args:
            username: Username of the login attempt
            login_time: Timestamp of login (seconds since epoch)
            status: "success" or "failed"
            ip_address: Optional IP address of login
        
        Returns:
            True if successful
        """
        try:
            log_data = {
                "user_id": username,
                "login_time": login_time,
                "status": status,
            }
            if ip_address:
                log_data["ip_address"] = ip_address
            
            # Store as: /login_logs/{username}/{timestamp}
            self.logs_ref.child(username).child(str(login_time)).set(log_data)
            return True
        except Exception as e:
            print(f"Error logging login: {e}")
            return False
    
    def get_login_logs(self, username: str) -> dict | None:
        """Retrieve all login logs for a user."""
        try:
            logs_data = self.logs_ref.child(username).get()
            return logs_data if logs_data else {}
        except Exception as e:
            print(f"Error retrieving logs: {e}")
            return {}
    
    def deactivate_user(self, username: str) -> bool:
        """Deactivate a user account."""
        try:
            self.users_ref.child(username).update({"is_active": False})
            return True
        except Exception as e:
            print(f"Error deactivating user: {e}")
            return False


# Singleton instance
firebase_db = None

def get_firebase_db() -> FirebaseUserDB:
    """Get or create Firebase DB instance."""
    global firebase_db
    if firebase_db is None:
        init_firebase()
        firebase_db = FirebaseUserDB()
    return firebase_db
