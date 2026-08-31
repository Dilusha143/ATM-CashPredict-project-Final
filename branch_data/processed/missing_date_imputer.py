"""
branch_data/processed/missing_date_imputer.py
===============================================
Sub-branch: PROCESSED
Responsibility: Detect and fill all missing dates per ATM using forward-fill.
                Rebuilds weekday and working_day for filled rows.
"""

import pandas as pd
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from shared.constants import ATM_LIST

NUMERIC_COLS = [
    'No_Of_Withdrawals', 'no_of_XYZ_card_withdrawals',
    'no_of_other_card_withdrawals', 'total_amount_withdrawn',
    'amount_withdrawn_XYZ_card', 'amount_withdrawn_other_card',
]


def fill_missing_dates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Fill missing dates per ATM.
    Strategy: reindex to full daily range → forward-fill numeric cols →
              recompute weekday and working_day from actual date.
    Returns merged DataFrame with all ATMs combined.
    """
    frames = []
    summary = {}

    for atm in df['atm_name'].unique():
        sub = df[df['atm_name'] == atm].copy().set_index('transaction_date')
        full_range = pd.date_range(sub.index.min(), sub.index.max(), freq='D')
        missing = full_range.difference(sub.index)
        summary[atm] = len(missing)

        sub = sub.reindex(full_range)
        sub[NUMERIC_COLS] = sub[NUMERIC_COLS].ffill().bfill()
        sub['atm_name']   = atm
        sub['weekday']    = sub.index.strftime('%A').str.lower()
        sub['working_day']= ['H' if i >= 5 else 'W' for i in sub.index.dayofweek]
        sub.index.name    = 'transaction_date'
        frames.append(sub.reset_index())

    result = pd.concat(frames, ignore_index=True)
    result = result.sort_values(['atm_name', 'transaction_date']).reset_index(drop=True)

    print("[PROCESSED] Missing dates filled per ATM:")
    total = 0
    for atm, cnt in summary.items():
        print(f"  {atm}: {cnt} dates filled")
        total += cnt
    print(f"  TOTAL: {total} | Final rows: {len(result)}")
    return result


def get_missing_dates(df_raw: pd.DataFrame, atm: str) -> list:
    """Return list of missing date strings for a given ATM."""
    sub = df_raw[df_raw['atm_name'] == atm].set_index('transaction_date')
    full_range = pd.date_range(sub.index.min(), sub.index.max(), freq='D')
    missing = full_range.difference(sub.index)
    return [d.strftime('%Y-%m-%d') for d in missing]


if __name__ == '__main__':
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'raw'))
    from data_loader import load_raw_data
    df_raw = load_raw_data()
    df_filled = fill_missing_dates(df_raw)
    print(f"\nFilled shape: {df_filled.shape}")
