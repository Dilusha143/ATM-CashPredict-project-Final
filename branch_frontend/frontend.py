"""
branch_frontend/frontend.py
=============================
Sub-branch: FRONTEND
Responsibility: Serve the HTML dashboard. Blueprint registered in app.py.
                All visual logic lives in templates/index.html + static/.
"""

from flask import Blueprint, render_template
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from shared.constants import ATM_LIST

frontend_bp = Blueprint(
    'frontend', __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static'
)


@frontend_bp.route('/')
def index():
    """Serve the main dashboard page."""
    return render_template('index.html', atm_list=ATM_LIST)
