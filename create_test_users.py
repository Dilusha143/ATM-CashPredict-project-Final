#!/usr/bin/env python
"""
create_test_users.py
====================
Script to create test users in Firebase Realtime Database.

Usage:
    python create_test_users.py

This script creates three test users:
    - admin / admin123
    - analyst / analyst123
    - viewer / viewer123
"""
import sys
import os

# Add parent directory to path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from branch_backend.config.firebase_config import init_firebase, get_firebase_db
from branch_backend.api.auth import create_user_in_firebase


def main():
    print("\n" + "="*60)
    print("  Firebase Test User Creation")
    print("="*60 + "\n")
    
    # Initialize Firebase
    try:
        init_firebase()
        print("✓ Firebase initialized\n")
    except Exception as e:
        print(f"✗ Firebase initialization failed: {e}")
        return False
    
    # Define test users
    test_users = [
        {"username": "admin", "password": "admin123", "description": "Administrator"},
        {"username": "analyst", "password": "analyst123", "description": "Data Analyst"},
        {"username": "viewer", "password": "viewer123", "description": "Viewer"},
    ]
    
    success_count = 0
    
    print("Creating test users:\n")
    for user in test_users:
        username = user["username"]
        password = user["password"]
        description = user["description"]
        
        result = create_user_in_firebase(username, password)
        
        if result["success"]:
            print(f"  ✓ {username:15} (Password: {password:20}) — {description}")
            success_count += 1
        else:
            print(f"  ✗ {username:15} — {result['message']}")
    
    print(f"\n" + "="*60)
    print(f"  Created {success_count}/{len(test_users)} test users")
    print("="*60 + "\n")
    
    if success_count > 0:
        print("Next steps:")
        print("  1. Start Flask backend:  python branch_backend/app.py")
        print("  2. Test login endpoint:  POST http://localhost:5000/auth/login")
        print("  3. Try credentials:      admin / admin123")
        print("\nFor full setup instructions, see: FIREBASE_AUTH_SETUP.md\n")
        return True
    else:
        print("Failed to create any users. Check Firebase connection.\n")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
