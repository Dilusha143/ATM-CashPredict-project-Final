"""
FIREBASE AUTHENTICATION SETUP GUIDE
=====================================

This document explains how to set up and use the Firebase authentication system
for the ATM CashPredict application.

### 1. FIREBASE PROJECT SETUP (Already Done!)
✓ Project ID: atmcashauth
✓ Database URL: https://atmcashauth-default-rtdb.firebaseio.com/
✓ serviceAccountKey.json: Located in branch_backend/

### 2. DATABASE STRUCTURE
The Firebase Realtime Database uses the following structure:

```
/
├── users/
│   ├── {username}/
│   │   ├── username: "string"
│   │   ├── password_hash: "SHA-256 hash"
│   │   ├── password_salt: "hex string"
│   │   ├── created_at: "timestamp (int)"
│   │   └── is_active: "boolean"
│   └── ... (more users)
│
└── login_logs/
    ├── {username}/
    │   ├── {timestamp}/
    │   │   ├── user_id: "string"
    │   │   ├── login_time: "timestamp (int)"
    │   │   ├── status: "success" | "failed"
    │   │   └── ip_address: "string (optional)"
    │   └── ... (more login times)
    └── ... (more users)
```

### 3. INSTALLING DEPENDENCIES

Run this in your project root:
```bash
pip install -r requirements.txt
```

This installs:
- firebase-admin>=6.0.0 (Firebase SDK)
- flask-session>=0.5.0 (Flask session management)
- python-dotenv>=1.0.0 (Environment variables)

### 4. RUNNING THE BACKEND

```bash
# From project root
python branch_backend/app.py
```

You should see:
```
============================================================
  ATM CashPredict — Firebase Authentication Edition
  Flask API  →  http://127.0.0.1:5000
  React UI   →  http://localhost:3000
  Debug mode →  OFF
  
  Auth Endpoints:
    POST   /auth/login         — Login with Firebase
    POST   /auth/logout        — Clear session
    GET    /auth/me            — Get current user (requires login)
    POST   /auth/register      — Create new user (admin-only)
    GET    /auth/login-history — Get login logs (requires login)
============================================================
```

### 5. CREATING TEST USERS

#### Option A: Using Python Script
Create and run this script (save as `create_test_users.py`):

```python
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from branch_backend.config.firebase_config import init_firebase, get_firebase_db
from branch_backend.api.auth import create_user_in_firebase

# Initialize Firebase
init_firebase()

# Create test users
test_users = [
    {"username": "admin", "password": "admin123"},
    {"username": "analyst", "password": "analyst123"},
    {"username": "viewer", "password": "viewer123"},
]

for user in test_users:
    result = create_user_in_firebase(user["username"], user["password"])
    if result["success"]:
        print(f"✓ {user['username']}: {result['message']}")
    else:
        print(f"✗ {user['username']}: {result['message']}")
```

Run it:
```bash
python create_test_users.py
```

#### Option B: Using cURL or Postman

Use the `/auth/register` endpoint:

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "admin_password": "admin_secret_key"
  }'
```

**NOTE**: Replace "admin_secret_key" with your actual admin authorization key.
Currently hardcoded in auth_routes.py — update for production!

### 6. TESTING LOGIN FLOW

#### Using cURL:

1. **Login:**
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful",
  "user_id": "admin"
}
```

2. **Check Current User (requires session):**
```bash
curl -X GET http://localhost:5000/auth/me \
  -b cookies.txt
```

Expected response:
```json
{
  "user_id": "admin",
  "login_time": 1688888888
}
```

3. **Get Login History:**
```bash
curl -X GET http://localhost:5000/auth/login-history \
  -b cookies.txt
```

4. **Logout:**
```bash
curl -X POST http://localhost:5000/auth/logout \
  -b cookies.txt
```

### 7. PASSWORD HASHING DETAILS

Passwords are hashed using SHA-256 with random salt:

1. **When creating a user:**
   - Generate random 16-byte salt (32 hex chars)
   - Combine: password + salt
   - Hash with SHA-256
   - Store both hash and salt in Firebase

2. **When verifying login:**
   - Retrieve stored salt from Firebase
   - Re-hash: password + stored_salt
   - Compare with stored hash
   - If match → login success

Example:
```
User enters: "mypassword123"
Salt from Firebase: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
Hash input: "mypassword123a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
SHA-256 result: "4f8dfe0e2a3b5c7d9e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"

On login:
- User enters: "mypassword123"
- Fetch salt: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
- Re-hash: "4f8dfe0e2a3b5c7d9e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
- Compare: MATCH ✓
```

### 8. FRONTEND INTEGRATION (React)

Update `branch_frontend/react_app/src/pages/LoginPage.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user ID in local storage (optional)
        localStorage.setItem('user_id', data.user_id);
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    }
  };

  return (
    <div className="login-container">
      <h2>ATM CashPredict Login</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;
```

### 9. SECURING PRODUCTION DEPLOYMENT

TODO Before going live:

☐ Set strong admin_password in auth_routes.py (or use environment variable)
☐ Change FLASK_SECRET_KEY via environment variable
☐ Set SESSION_COOKIE_SECURE = True (requires HTTPS)
☐ Use Redis for sessions instead of filesystem
☐ Enable Firebase Realtime Database security rules
☐ Set up Firebase Realtime Database rules to restrict direct access
☐ Implement password complexity requirements
☐ Add email verification for new accounts
☐ Consider 2-factor authentication

### 10. TROUBLESHOOTING

**Error: "Firebase initialization warning"**
- Check serviceAccountKey.json path
- Verify file is not corrupted
- Check JSON syntax

**Error: "User not found" on valid login**
- Create test users first (see Section 5)
- Check username/password spelling (case-sensitive)
- Verify user's is_active flag is true in Firebase

**Error: "Not logged in" on protected endpoints**
- Ensure credentials: 'include' in fetch requests
- Check if session cookie is being sent
- Verify SESSION_COOKIE_HTTPONLY setting

**Firebase Realtime Database appears empty**
- Check if rules allow public read/write (dev only!)
- Verify serviceAccountKey.json credentials
- Go to Firebase Console → Realtime Database → Data to inspect

### 11. API ENDPOINTS REFERENCE

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /auth/login | POST | None | Login with username/password |
| /auth/logout | POST | Session | Clear user session |
| /auth/me | GET | Session | Get current logged-in user |
| /auth/register | POST | Admin Key | Create new user (admin-only) |
| /auth/login-history | GET | Session | Get login logs for user |

**Note**: "Session" means user must be logged in (user_id in Flask session)

"""
