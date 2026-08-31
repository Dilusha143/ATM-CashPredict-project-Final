"""
branch_data/ingestion.py
========================
Sub-branch: RAW DATA
Loads and validates the raw ATM-Dataset.csv.
"""
import pandas as pd
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.config import PATHS, ATM_LIST

REQUIRED_COLS = [
    "atm_name", "transaction_date", "No_Of_Withdrawals",
    "no_of_XYZ_card_withdrawals", "no_of_other_card_withdrawals",
    "total_amount_withdrawn", "amount_withdrawn_XYZ_card",
    "amount_withdrawn_other_card", "weekday", "working_day",
]
NUMERIC_COLS = [
    "No_Of_Withdrawals", "no_of_XYZ_card_withdrawals",
    "no_of_other_card_withdrawals", "total_amount_withdrawn",
    "amount_withdrawn_XYZ_card", "amount_withdrawn_other_card",
]


def load_raw(path: str = None) -> pd.DataFrame:
    """Load raw CSV, parse dates, validate schema."""
    path = path or PATHS["raw_data"]
    df = pd.read_csv(path)

    # Validate columns
    missing = set(REQUIRED_COLS) - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in raw CSV: {missing}")

    df["transaction_date"] = pd.to_datetime(
        df["transaction_date"], format="%d/%m/%Y", errors="coerce"
    )
    df = df.dropna(subset=["transaction_date"])
    df = df.sort_values(["atm_name", "transaction_date"]).reset_index(drop=True)
    return df


def validate_raw(df: pd.DataFrame) -> dict:
    """Return a validation report for the raw dataset."""
    report = {
        "rows":       len(df),
        "atms":       df["atm_name"].nunique(),
        "atm_names":  df["atm_name"].unique().tolist(),
        "date_min":   str(df["transaction_date"].min().date()),
        "date_max":   str(df["transaction_date"].max().date()),
        "null_counts": df[NUMERIC_COLS].isnull().sum().to_dict(),
        "negative_amounts": int((df["total_amount_withdrawn"] < 0).sum()),
    }
    return report


def get_missing_dates(df: pd.DataFrame) -> dict:
    """Return missing dates per ATM."""
    missing = {}
    for atm in df["atm_name"].unique():
        sub = df[df["atm_name"] == atm].set_index("transaction_date")
        full = pd.date_range(sub.index.min(), sub.index.max(), freq="D")
        gaps = full.difference(sub.index)
        missing[atm] = {
            "count": len(gaps),
            "dates": [d.strftime("%Y-%m-%d") for d in gaps],
        }
    return missing


if __name__ == "__main__":
    df = load_raw()
    print("=== Raw Data Validation ===")
    report = validate_raw(df)
    for k, v in report.items():
        print(f"  {k}: {v}")
    missing = get_missing_dates(df)
    print("\n=== Missing Dates per ATM ===")
    for atm, info in missing.items():
        print(f"  {atm}: {info['count']} missing dates")
