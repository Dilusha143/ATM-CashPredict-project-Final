"""
branch_backend/app.py  —  Flask entry point
Run:  python branch_backend/app.py
React: cd branch_frontend/react_app && npm run dev  →  http://localhost:3000

Security hardening applied:
  - Firebase authentication with SHA-256 password hashing
  - Flask sessions store UserID after successful login
  - /login is rate-limited to stop brute-force password guessing
  - secret_key loaded from FLASK_SECRET_KEY env var (random fallback, not committed)
  - debug mode OFF by default — only on if FLASK_DEBUG=1 is explicitly set
"""
import sys, os, secrets
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, request, make_response
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_session import Session
from shared.config import FLASK_HOST, FLASK_PORT, ATM_LIST
from branch_backend.core.predictor import ATMPredictor
from branch_backend.api.routes import api, init_predictor
from branch_backend.api.report_routes import report_api, init_report_predictor
from branch_backend.api.auth_routes import auth_api
from branch_backend.config.firebase_config import init_firebase

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__,
    template_folder=os.path.join(ROOT, "branch_frontend", "templates"),
    static_folder=  os.path.join(ROOT, "branch_frontend", "static"))

# ── Secret key ───────────────────────────────────────────────
# Read from environment; generate a random one if not set so the app
# never silently runs with a hardcoded, committed key. Set
# FLASK_SECRET_KEY in your environment for a stable key across restarts.
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)

# ── Flask Session Configuration ──────────────────────────────
# Sessions stored in-memory (for dev/demo); use Redis in production
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_COOKIE_SECURE"] = False  # Set to True if using HTTPS
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
Session(app)

# ── Debug mode ───────────────────────────────────────────────
# OFF by default. Flask's debugger exposes a live Python console on
# unhandled exceptions — never leave this on in front of real users.
FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "0") == "1"

# ── Firebase Initialization ──────────────────────────────────
try:
    init_firebase()
    print("✓ Firebase initialized successfully")
except Exception as e:
    print(f"⚠ Firebase initialization warning: {e}")

# ── Rate limiting ────────────────────────────────────────────
# Slows down brute-force password guessing against /login.
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],          # no global limit, just targeted ones below
    storage_uri="memory://",    # fine for single-process dev/demo use
)

@app.errorhandler(429)
def rate_limit_handler(e):
    return {"error": "Too many login attempts. Please wait a minute and try again."}, 429

# Manual CORS — allows React dev server to call Flask without flask-cors
ALLOWED = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        resp = make_response("", 200)
        _add_cors(resp)
        return resp

@app.after_request
def add_cors(resp):
    _add_cors(resp)
    return resp

def _add_cors(resp):
    origin = request.headers.get("Origin", "")
    if origin in ALLOWED:
        resp.headers["Access-Control-Allow-Origin"]  = origin
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Credentials"] = "true"

predictor = ATMPredictor()
init_predictor(predictor)
init_report_predictor(predictor)

# ── Register Blueprints ──────────────────────────────────────
app.register_blueprint(api)
app.register_blueprint(report_api)
app.register_blueprint(auth_api, url_prefix="/auth")

# Apply rate limit to Firebase login endpoint (5 attempts per minute per IP)
app.view_functions["auth_api.login"] = limiter.limit("5 per minute")(app.view_functions["auth_api.login"])

@app.route("/")
def index():
    return render_template("index.html", atm_list=ATM_LIST)

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  ATM CashPredict — Firebase Authentication Edition")
    print(f"  Flask API  →  http://127.0.0.1:{FLASK_PORT}")
    print(f"  React UI   →  http://localhost:3000")
    print(f"  Debug mode →  {'ON (set FLASK_DEBUG=0 to disable)' if FLASK_DEBUG else 'OFF'}")
    print("  ")
    print("  Auth Endpoints:")
    print("    POST   /auth/login         — Login with Firebase")
    print("    POST   /auth/logout        — Clear session")
    print("    GET    /auth/me            — Get current user (requires login)")
    print("    POST   /auth/register      — Create new user (admin-only)")
    print("    GET    /auth/login-history — Get login logs (requires login)")
    print("="*60 + "\n")
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
