"""
shared/utils.py  —  Helper functions used across all branches
"""
import numpy as np
import pandas as pd
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.config import INDIA_HOLIDAYS, ZONE_MAP, ATM_ENC, ZONE_ENC, FEATURE_COLS


def smape(actual, predicted) -> float:
    a = np.array(actual, dtype=float)
    p = np.array(predicted, dtype=float)
    return float(np.mean(2 * np.abs(a - p) / (np.abs(a) + np.abs(p) + 1e-8)) * 100)


def build_features_for_date(df, atm, target_date, is_holiday_override="auto"):
    """Build a 32-feature vector for one ATM on one date."""
    sub    = df[df["atm_name"] == atm].sort_values("transaction_date")
    recent = sub[sub["transaction_date"] < target_date].tail(400)
    if len(recent) < 30:
        return None

    amt = recent["total_amount_withdrawn"].values
    txn = recent["No_Of_Withdrawals"].values

    is_hol = (int(target_date in INDIA_HOLIDAYS)
              if is_holiday_override == "auto"
              else int(is_holiday_override))
    pre_h  = int((target_date + pd.Timedelta(days=1)) in INDIA_HOLIDAYS)
    post_h = int((target_date - pd.Timedelta(days=1)) in INDIA_HOLIDAYS)
    is_me  = int(target_date.day == pd.Period(str(target_date.date()), "M").days_in_month)

    feat = {
        "atm_encoded":        ATM_ENC.get(atm, 0),
        "zone_encoded":       ZONE_ENC.get(ZONE_MAP.get(atm, "unknown"), 4),
        "day_of_week":        target_date.dayofweek,
        "month":              target_date.month,
        "day":                target_date.day,
        "is_weekend":         int(target_date.dayofweek >= 5),
        "is_month_end":       is_me,
        "is_month_start":     int(target_date.day == 1),
        "is_holiday":         is_hol,
        "pre_holiday":        pre_h,
        "post_holiday":       post_h,
        "is_salary_day":      int(target_date.day == 1 or is_me),
        "dow_sin":            np.sin(2 * np.pi * target_date.dayofweek / 7),
        "dow_cos":            np.cos(2 * np.pi * target_date.dayofweek / 7),
        "month_sin":          np.sin(2 * np.pi * target_date.month / 12),
        "month_cos":          np.cos(2 * np.pi * target_date.month / 12),
        "xyz_ratio":          float(recent["xyz_ratio"].mean()) if "xyz_ratio" in recent.columns else 0.5,
        "avg_withdrawal_size":float(recent["avg_withdrawal_size"].mean()) if "avg_withdrawal_size" in recent.columns else 0,
        "lag_1d":             float(amt[-1]),
        "lag_7d":             float(amt[-7]),
        "lag_14d":            float(amt[-14]),
        "lag_28d":            float(amt[-28]) if len(amt) >= 28 else float(np.mean(amt)),
        "roll_mean_7d":       float(np.mean(amt[-7:])),
        "roll_mean_14d":      float(np.mean(amt[-14:])),
        "roll_mean_30d":      float(np.mean(amt[-30:])),
        "roll_std_7d":        float(np.std(amt[-7:])),
        "roll_std_30d":       float(np.std(amt[-30:])),
        "lag_same_weekday":   float(amt[-7]),
        "txn_lag_1d":         float(txn[-1]),
        "txn_lag_7d":         float(txn[-7]),
        "txn_roll_7d":        float(np.mean(txn[-7:])),
        "anomaly_flag":       0,
    }
    return pd.DataFrame([feat])[FEATURE_COLS]
