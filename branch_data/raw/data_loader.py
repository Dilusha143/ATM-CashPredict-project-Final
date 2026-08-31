"""
branch_data/raw/data_loader.py
================================
Sub-branch: RAW
Responsibility: Load the original ATM-Dataset.csv and return a clean DataFrame.
"""

import pandas as pd
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from shared.constants import RAW_DATA_PATH, ATM_LIST


def load_raw_data(path: str = RAW_DATA_PATH) -> pd.DataFrame:
    """Load raw ATM transaction CSV. Returns sorted, typed DataFrame."""
    df = pd.read_csv(path)
    df['transaction_date'] = pd.to_datetime(
        df['transaction_date'], format='%d/%m/%Y', errors='coerce'
    )
    df = df.dropna(subset=['transaction_date'])
    df = df.sort_values(['atm_name', 'transaction_date']).reset_index(drop=True)
    print(f"[RAW] Loaded {len(df)} rows | ATMs: {df['atm_name'].nunique()} | "
          f"Date range: {df['transaction_date'].min().date()} → {df['transaction_date'].max().date()}")
    return df


def get_atm_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Return per-ATM row count and date coverage."""
    return df.groupby('atm_name').agg(
        rows=('transaction_date', 'count'),
        first_date=('transaction_date', 'min'),
        last_date=('transaction_date', 'max'),
    ).reset_index()


if __name__ == '__main__':
    df = load_raw_data()
    print(get_atm_summary(df).to_string(index=False))
