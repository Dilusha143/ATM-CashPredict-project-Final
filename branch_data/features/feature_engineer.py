"""
branch_data/features/feature_engineer.py
==========================================
Sub-branch: FEATURES
Responsibility: Build all 38 engineered features from the filled DataFrame.
  - Calendar features (12)
  - Holiday features (4)
  - ATM-specific features (4)
  - Lag features (6)
  - Rolling stats (8)
  - Anomaly flag (1)
  - Encodings (3)
"""

import pandas as pd
import numpy as np
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from shared.constants import (
    INDIA_HOLIDAYS, ZONE_MAP, PROCESSED_DATA_PATH, ATM_LIST
)
from sklearn.preprocessing import LabelEncoder


# ── Sub-branch: Calendar ───────────────────────────────────
def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['year']         = df['transaction_date'].dt.year
    df['month']        = df['transaction_date'].dt.month
    df['day']          = df['transaction_date'].dt.day
    df['day_of_week']  = df['transaction_date'].dt.dayofweek
    df['is_weekend']   = (df['day_of_week'] >= 5).astype(int)
    df['is_month_end'] = df['transaction_date'].dt.is_month_end.astype(int)
    df['is_month_start']= df['transaction_date'].dt.is_month_start.astype(int)
    df['quarter']      = df['transaction_date'].dt.quarter
    df['dow_sin']      = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['dow_cos']      = np.cos(2 * np.pi * df['day_of_week'] / 7)
    df['month_sin']    = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos']    = np.cos(2 * np.pi * df['month'] / 12)
    print(f"  [features/calendar] 12 calendar features added")
    return df


# ── Sub-branch: Holidays ───────────────────────────────────
def add_holiday_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['is_holiday']   = df['transaction_date'].isin(INDIA_HOLIDAYS).astype(int)
    df['pre_holiday']  = df['transaction_date'].apply(
        lambda d: int((d + pd.Timedelta(days=1)) in INDIA_HOLIDAYS))
    df['post_holiday'] = df['transaction_date'].apply(
        lambda d: int((d - pd.Timedelta(days=1)) in INDIA_HOLIDAYS))
    df['is_salary_day']= ((df['day'] == 1) | (df['is_month_end'] == 1)).astype(int)
    print(f"  [features/holidays] 4 holiday features added | "
          f"holiday days: {df['is_holiday'].sum()}")
    return df


# ── Sub-branch: ATM-specific ───────────────────────────────
def add_atm_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['atm_zone']          = df['atm_name'].map(ZONE_MAP).fillna('unknown')
    df['atm_global_mean']   = df.groupby('atm_name')['total_amount_withdrawn'].transform('mean')
    df['xyz_ratio']         = df['amount_withdrawn_XYZ_card'] / (df['total_amount_withdrawn'] + 1)
    df['avg_withdrawal_size']= df['total_amount_withdrawn'] / (df['No_Of_Withdrawals'] + 1)
    print(f"  [features/atm] 4 ATM-specific features added")
    return df


# ── Sub-branch: Lags ───────────────────────────────────────
def add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for atm in df['atm_name'].unique():
        mask = df['atm_name'] == atm
        idx  = df.loc[mask].index
        s    = pd.Series(df.loc[mask, 'total_amount_withdrawn'].values, index=idx)
        sn   = pd.Series(df.loc[mask, 'No_Of_Withdrawals'].values, index=idx)
        for lag in [1, 2, 3, 7, 14, 28]:
            df.loc[mask, f'lag_{lag}d'] = s.shift(lag).values
        for win in [3, 7, 14, 30]:
            df.loc[mask, f'roll_mean_{win}d'] = s.shift(1).rolling(win).mean().values
            df.loc[mask, f'roll_std_{win}d']  = s.shift(1).rolling(win).std().values
        df.loc[mask, 'lag_same_weekday'] = s.shift(7).values
        df.loc[mask, 'lag_365d']         = s.shift(365).values
        df.loc[mask, 'txn_lag_1d']       = sn.shift(1).values
        df.loc[mask, 'txn_lag_7d']       = sn.shift(7).values
        df.loc[mask, 'txn_roll_7d']      = sn.shift(1).rolling(7).mean().values
    print(f"  [features/lags] Lag + rolling features added (6 lags, 8 rolling)")
    return df


# ── Sub-branch: Anomaly ────────────────────────────────────
def add_anomaly_flag(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    m = df.groupby('atm_name')['total_amount_withdrawn'].transform('mean')
    s = df.groupby('atm_name')['total_amount_withdrawn'].transform('std')
    df['anomaly_flag'] = (
        (df['total_amount_withdrawn'] > m + 3*s) |
        (df['total_amount_withdrawn'] < m - 3*s)
    ).astype(int)
    print(f"  [features/anomaly] Anomaly flag added | flagged: {df['anomaly_flag'].sum()}")
    return df


# ── Sub-branch: Encodings ──────────────────────────────────
def add_encodings(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    le_atm  = LabelEncoder()
    le_zone = LabelEncoder()
    df['atm_encoded']  = le_atm.fit_transform(df['atm_name'])
    df['zone_encoded'] = le_zone.fit_transform(df['atm_zone'])
    print(f"  [features/encodings] atm_encoded, zone_encoded added")
    return df


# ── Master pipeline ────────────────────────────────────────
def build_all_features(df: pd.DataFrame) -> pd.DataFrame:
    """Run all feature sub-branches in order."""
    print("[FEATURES] Building feature matrix...")
    df = add_calendar_features(df)
    df = add_holiday_features(df)
    df = add_atm_features(df)
    df = add_lag_features(df)
    df = add_anomaly_flag(df)
    df = add_encodings(df)
    df.to_csv(PROCESSED_DATA_PATH, index=False)
    print(f"[FEATURES] Done. Shape: {df.shape} | Saved to: {PROCESSED_DATA_PATH}")
    return df


if __name__ == '__main__':
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'raw'))
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'processed'))
    from data_loader import load_raw_data
    from missing_date_imputer import fill_missing_dates
    raw  = load_raw_data()
    filled = fill_missing_dates(raw)
    df_feat = build_all_features(filled)
