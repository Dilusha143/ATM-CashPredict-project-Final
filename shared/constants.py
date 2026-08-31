"""
shared/constants.py
====================
Central constants shared across ALL branches.
Import from here — never hardcode in individual branch files.
"""

import os

# ── Root paths ─────────────────────────────────────────────
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BRANCH_DATA     = os.path.join(ROOT_DIR, "branch_data")
BRANCH_MODEL    = os.path.join(ROOT_DIR, "branch_model")
BRANCH_BACKEND  = os.path.join(ROOT_DIR, "branch_backend")
BRANCH_FRONTEND = os.path.join(ROOT_DIR, "branch_frontend")

# ── Data sub-branch paths ──────────────────────────────────
RAW_DATA_PATH       = os.path.join(BRANCH_DATA, "raw",       "ATM-Dataset.csv")
PROCESSED_DATA_PATH = os.path.join(BRANCH_DATA, "processed", "ATM_master_features.csv")
FEATURES_DIR        = os.path.join(BRANCH_DATA, "features")

# ── Model sub-branch paths ─────────────────────────────────
SAVED_MODELS_DIR  = os.path.join(BRANCH_MODEL, "saved_models")
EVALUATION_DIR    = os.path.join(BRANCH_MODEL, "evaluation")
MODEL_RESULTS_PATH= os.path.join(EVALUATION_DIR, "model_results.json")

# ── ATM definitions ────────────────────────────────────────
ATM_LIST = [
    "Airport ATM",
    "Big Street ATM",
    "Christ College ATM",
    "KK Nagar ATM",
    "Mount Road ATM",
]

ZONE_MAP = {
    "Airport ATM":       "transport",
    "Big Street ATM":    "commercial",
    "Christ College ATM":"educational",
    "KK Nagar ATM":      "residential",
    "Mount Road ATM":    "commercial",
}

MISSING_COUNTS = {
    "Airport ATM":       211,
    "Mount Road ATM":    208,
    "Big Street ATM":    110,
    "Christ College ATM":109,
    "KK Nagar ATM":      93,
}

ATM_ENC  = {a: i for i, a in enumerate(sorted(ATM_LIST))}
ZONE_ENC = {"commercial": 0, "educational": 1, "residential": 2, "transport": 3, "unknown": 4}

# ── Feature columns (32 features — must match saved .pkl models exactly) ──
FEATURE_COLS = [
    "atm_encoded", "zone_encoded", "day_of_week", "month", "day",
    "is_weekend", "is_month_end", "is_month_start", "is_holiday",
    "pre_holiday", "post_holiday", "is_salary_day",
    "dow_sin", "dow_cos", "month_sin", "month_cos",
    "xyz_ratio", "avg_withdrawal_size",
    "lag_1d", "lag_7d", "lag_14d", "lag_28d",
    "roll_mean_7d", "roll_mean_14d", "roll_mean_30d",
    "roll_std_7d", "roll_std_30d",
    "lag_same_weekday",
    "txn_lag_1d", "txn_lag_7d", "txn_roll_7d",
    "anomaly_flag",
]

TARGET_COL = "total_amount_withdrawn"

# ── India / Tamil Nadu holidays 2011-2025 ─────────────────
import pandas as pd
INDIA_HOLIDAYS = set()
for _y in range(2011, 2026):
    for _m, _d in [(1,1),(1,14),(1,15),(1,26),(4,14),(8,15),(10,2),(12,25)]:
        INDIA_HOLIDAYS.add(pd.Timestamp(_y, _m, _d))
# Diwali (varies)
for _ts in [
    pd.Timestamp(2011,10,26), pd.Timestamp(2012,11,13), pd.Timestamp(2013,11,3),
    pd.Timestamp(2014,10,23), pd.Timestamp(2015,11,11), pd.Timestamp(2016,10,30),
    pd.Timestamp(2017,10,19), pd.Timestamp(2018,11,7),  pd.Timestamp(2019,10,27),
    pd.Timestamp(2020,11,14), pd.Timestamp(2021,11,4),  pd.Timestamp(2022,10,24),
    pd.Timestamp(2023,11,12), pd.Timestamp(2024,11,1),
]:
    INDIA_HOLIDAYS.add(_ts)

# ── Model hyperparameters ──────────────────────────────────
XGB_PARAMS = {
    "n_estimators":    400,
    "learning_rate":   0.03,
    "max_depth":       4,
    "subsample":       0.8,
    "colsample_bytree":0.7,
    "min_child_weight":5,
    "random_state":    42,
    "verbosity":       0,
}

TRAIN_TEST_SPLIT = 0.80   # 80% train, 20% test

# ── Flask settings ─────────────────────────────────────────
FLASK_HOST = "0.0.0.0"
FLASK_PORT = 5000
FLASK_DEBUG = True
