"""
branch_backend/config/settings.py
===================================
Sub-branch: CONFIG
Responsibility: All Flask app settings and runtime configuration.
"""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from shared.constants import FLASK_HOST, FLASK_PORT, FLASK_DEBUG

class Config:
    """Base Flask configuration."""
    HOST  = FLASK_HOST
    PORT  = FLASK_PORT
    DEBUG = FLASK_DEBUG
    JSON_SORT_KEYS = False
    SECRET_KEY     = os.environ.get('SECRET_KEY', 'atm-predict-dev-key')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    HOST  = "0.0.0.0"

# Active config
ACTIVE_CONFIG = DevelopmentConfig()
