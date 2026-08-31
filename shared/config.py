"""
shared/config.py  —  Central configuration for all branches
"""
import os, pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PATHS = {
    "raw_data":       os.path.join(BASE_DIR, "branch_data",  "raw",       "ATM-Dataset.csv"),
    "processed_data": os.path.join(BASE_DIR, "branch_data",  "processed", "ATM_master_features.csv"),
    "models_dir":     os.path.join(BASE_DIR, "branch_model", "saved_models"),
    "eval_dir":       os.path.join(BASE_DIR, "branch_model", "evaluation"),
    "reports_dir":    os.path.join(BASE_DIR, "reports"),
}

ATM_LIST = [
    "Airport ATM", "Big Street ATM", "Christ College ATM",
    "KK Nagar ATM", "Mount Road ATM",
]

ZONE_MAP = {
    "Airport ATM":        "transport",
    "Big Street ATM":     "commercial",
    "Christ College ATM": "educational",
    "KK Nagar ATM":       "residential",
    "Mount Road ATM":     "commercial",
}

ATM_ENC  = {a: i for i, a in enumerate(sorted(ATM_LIST))}
ZONE_ENC = {"commercial": 0, "educational": 1, "residential": 2, "transport": 3, "unknown": 4}

MISSING_COUNTS = {
    "Airport ATM": 211, "Mount Road ATM": 208,
    "Big Street ATM": 110, "Christ College ATM": 109, "KK Nagar ATM": 93,
}

# Exact 32 features the saved .pkl models were trained with
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

# India / Tamil Nadu public holidays
INDIA_HOLIDAYS = set()
for _y in range(2011, 2026):
    for _m, _d in [(1,1),(1,14),(1,15),(1,26),(4,14),(8,15),(10,2),(12,25)]:
        INDIA_HOLIDAYS.add(pd.Timestamp(_y, _m, _d))
for _ts in [
    pd.Timestamp(2011,10,26), pd.Timestamp(2012,11,13),
    pd.Timestamp(2013,11,3),  pd.Timestamp(2014,10,23),
    pd.Timestamp(2015,11,11), pd.Timestamp(2016,10,30),
    pd.Timestamp(2017,10,19),
]:
    INDIA_HOLIDAYS.add(_ts)

MODEL_PARAMS = {
    "n_estimators": 400, "learning_rate": 0.03, "max_depth": 4,
    "subsample": 0.8, "colsample_bytree": 0.7,
    "min_child_weight": 5, "random_state": 42,
}
TRAIN_SPLIT = 0.80
P10_FACTOR  = 0.80
P90_FACTOR  = 1.20
FLASK_HOST  = os.environ.get("FLASK_HOST", "127.0.0.1")
FLASK_PORT  = int(os.environ.get("FLASK_PORT", "5000"))
FLASK_DEBUG = os.environ.get("FLASK_DEBUG", "1") == "1"
