"""
branch_data/feature_engineering.py
=====================================
Sub-branch: FEATURES
Adds all 38 engineered features on top of processed data.
Saves master feature matrix to branch_data/features/.
"""
import pandas as pd
import numpy as np
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.config import PATHS, INDIA_HOLIDAYS, ZONE_MAP, ATM_ENC, ZONE_ENC
from sklearn.preprocessing import LabelEncoder


def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    """Sub-branch: Calendar & cyclical features (12 features)."""
    df = df.copy()
    df["year"]          = df["transaction_date"].dt.year
    df["month"]         = df["transaction_date"].dt.month
    df["day"]           = df["transaction_date"].dt.day
    df["day_of_week"]   = df["transaction_date"].dt.dayofweek
    df["is_weekend"]    = (df["day_of_week"] >= 5).astype(int)
    df["is_month_end"]  = df["transaction_date"].dt.is_month_end.astype(int)
    df["is_month_start"]= df["transaction_date"].dt.is_month_start.astype(int)
    df["quarter"]       = df["transaction_date"].dt.quarter
    # Cyclical encoding (better for periodic patterns than raw integers)
    df["dow_sin"]       = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"]       = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["month_sin"]     = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"]     = np.cos(2 * np.pi * df["month"] / 12)
    return df


def add_holiday_features(df: pd.DataFrame) -> pd.DataFrame:
    """Sub-branch: Holiday, pre/post holiday, salary day (4 features)."""
    df = df.copy()
    df["is_holiday"]    = df["transaction_date"].isin(INDIA_HOLIDAYS).astype(int)
    df["pre_holiday"]   = df["transaction_date"].apply(
        lambda d: int((d + pd.Timedelta(days=1)) in INDIA_HOLIDAYS))
    df["post_holiday"]  = df["transaction_date"].apply(
        lambda d: int((d - pd.Timedelta(days=1)) in INDIA_HOLIDAYS))
    df["is_salary_day"] = ((df["day"] == 1) | (df["is_month_end"] == 1)).astype(int)
    return df


def add_atm_features(df: pd.DataFrame) -> pd.DataFrame:
    """Sub-branch: ATM-specific ratio and zone features (4 features)."""
    df = df.copy()
    df["atm_zone"]           = df["atm_name"].map(ZONE_MAP).fillna("unknown")
    df["atm_global_mean"]    = df.groupby("atm_name")["total_amount_withdrawn"].transform("mean")
    df["xyz_ratio"]          = df["amount_withdrawn_XYZ_card"] / (df["total_amount_withdrawn"] + 1)
    df["avg_withdrawal_size"]= df["total_amount_withdrawn"] / (df["No_Of_Withdrawals"] + 1)
    return df


def add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Sub-branch: Lag & rolling window features (18 features)."""
    df = df.copy()
    atm_list = df["atm_name"].unique()

    for atm in atm_list:
        mask = df["atm_name"] == atm
        idx  = df.loc[mask].index
        s    = pd.Series(df.loc[mask, "total_amount_withdrawn"].values, index=idx)
        sn   = pd.Series(df.loc[mask, "No_Of_Withdrawals"].values, index=idx)

        for lag in [1, 2, 3, 7, 14, 28]:
            df.loc[mask, f"lag_{lag}d"] = s.shift(lag).values

        for win in [3, 7, 14, 30]:
            df.loc[mask, f"roll_mean_{win}d"] = s.shift(1).rolling(win).mean().values
            df.loc[mask, f"roll_std_{win}d"]  = s.shift(1).rolling(win).std().values

        df.loc[mask, "lag_same_weekday"] = s.shift(7).values
        df.loc[mask, "lag_365d"]         = s.shift(365).values
        df.loc[mask, "txn_lag_1d"]       = sn.shift(1).values
        df.loc[mask, "txn_lag_7d"]       = sn.shift(7).values
        df.loc[mask, "txn_roll_7d"]      = sn.shift(1).rolling(7).mean().values

    return df


def add_anomaly_flag(df: pd.DataFrame) -> pd.DataFrame:
    """Sub-branch: Flag statistical anomalies (>3σ from ATM mean)."""
    df   = df.copy()
    mean = df.groupby("atm_name")["total_amount_withdrawn"].transform("mean")
    std  = df.groupby("atm_name")["total_amount_withdrawn"].transform("std")
    df["anomaly_flag"] = (
        (df["total_amount_withdrawn"] > mean + 3 * std) |
        (df["total_amount_withdrawn"] < mean - 3 * std)
    ).astype(int)
    return df


def encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    """Sub-branch: Label-encode ATM name and zone."""
    df = df.copy()
    df["atm_encoded"]  = df["atm_name"].map(ATM_ENC).fillna(0).astype(int)
    df["zone_encoded"] = df["atm_zone"].map(ZONE_ENC).fillna(4).astype(int)
    return df


def run_feature_engineering(df_processed: pd.DataFrame = None,
                             save: bool = True) -> pd.DataFrame:
    """Run the full feature engineering pipeline."""
    print("=== Branch Data — Feature Engineering ===")

    if df_processed is None:
        df_processed = pd.read_csv(PATHS["processed_data"], parse_dates=["transaction_date"])

    df = df_processed.copy()
    df = add_calendar_features(df);   print("  ✓ Calendar features (12)")
    df = add_holiday_features(df);    print("  ✓ Holiday features (4)")
    df = add_atm_features(df);        print("  ✓ ATM-specific features (4)")
    df = add_lag_features(df);        print("  ✓ Lag & rolling features (18)")
    df = add_anomaly_flag(df);        print("  ✓ Anomaly flag (1)")
    df = encode_categoricals(df);     print("  ✓ Encoded categoricals")

    print(f"  Total features: {len(df.columns)} columns, {len(df)} rows")

    if save:
        # Save master feature matrix
        out = os.path.join(PATHS["processed_data"])
        df.to_csv(out, index=False)
        print(f"  Saved: {out}")

        # Save feature metadata
        meta = {
            "total_features": len(df.columns),
            "feature_cols":   list(df.columns),
            "anomaly_count":  int(df["anomaly_flag"].sum()),
            "date_min":       str(df["transaction_date"].min().date()),
            "date_max":       str(df["transaction_date"].max().date()),
        }
        meta_path = PATHS["features_meta"]
        os.makedirs(os.path.dirname(meta_path), exist_ok=True)
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)
        print(f"  Saved: {meta_path}")

    return df


if __name__ == "__main__":
    run_feature_engineering()
