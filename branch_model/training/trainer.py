"""
branch_model/training/trainer.py
Run: python branch_model/training/trainer.py

Trains BOTH an XGBoost model and a Random Forest model per ATM on the same
80/20 chronological split, keeps whichever one scores lower (better) sMAPE
on the held-out test set for that ATM, and saves only the winner.

This replaces the earlier "one algorithm for every ATM" approach. The choice
is not arbitrary -- it is based on the real four-model comparison recorded in
branch_model/evaluation/model_comparison_results.json (see thesis Section 3.5),
which found XGBoost best overall but Random Forest narrowly ahead specifically
at Christ College ATM and Mount Road ATM. Rather than hard-code that result,
this script re-derives the winner from a fresh fit every time it runs, so the
choice stays honest if the underlying data changes.

Model selection per ATM is recorded in saved_models/model_manifest.json so
that predictor.py and evaluator.py know which algorithm/file to load, without
either of those files needing to hard-code per-ATM logic themselves.
"""
import pandas as pd, numpy as np, joblib, json, warnings, sys, os
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from shared.config import PATHS, ATM_LIST, FEATURE_COLS, TARGET_COL, MODEL_PARAMS, TRAIN_SPLIT
import xgboost as xgb
from sklearn.ensemble import RandomForestRegressor

RF_PARAMS = dict(n_estimators=400, max_depth=8, min_samples_leaf=5, random_state=42, n_jobs=-1)


def _smape(y_true, y_pred):
    return float(np.mean(2 * np.abs(y_true - y_pred) / (np.abs(y_true) + np.abs(y_pred) + 1e-8)) * 100)


def train_all(df=None, save=True):
    print("=" * 55)
    print("BRANCH MODEL — Training (per-ATM algorithm selection)")
    print("=" * 55)
    if df is None:
        df = pd.read_csv(PATHS["processed_data"], parse_dates=["transaction_date"])

    models = {}
    manifest = {}
    os.makedirs(PATHS["models_dir"], exist_ok=True)

    for atm in ATM_LIST:
        sub   = df[df["atm_name"]==atm].dropna(subset=FEATURE_COLS+[TARGET_COL])
        sub   = sub[sub[TARGET_COL]>0].sort_values("transaction_date").reset_index(drop=True)
        split = int(len(sub)*TRAIN_SPLIT)

        X_tr = sub.iloc[:split][FEATURE_COLS]
        y_tr = np.log1p(sub.iloc[:split][TARGET_COL])
        X_te = sub.iloc[split:][FEATURE_COLS]
        y_te = sub.iloc[split:][TARGET_COL].values

        # Candidate 1: XGBoost
        xgb_model = xgb.XGBRegressor(**MODEL_PARAMS, verbosity=0)
        xgb_model.fit(X_tr, y_tr)
        xgb_preds = np.expm1(xgb_model.predict(X_te))
        xgb_smape = _smape(y_te, xgb_preds)

        # Candidate 2: Random Forest
        rf_model = RandomForestRegressor(**RF_PARAMS)
        rf_model.fit(X_tr, y_tr)
        rf_preds = np.expm1(rf_model.predict(X_te))
        rf_smape = _smape(y_te, rf_preds)

        if xgb_smape <= rf_smape:
            winner, winner_model, winner_smape, suffix = "xgb", xgb_model, xgb_smape, "_xgb.pkl"
        else:
            winner, winner_model, winner_smape, suffix = "rf", rf_model, rf_smape, "_rf.pkl"

        models[atm] = winner_model
        manifest[atm] = winner

        if save:
            path = os.path.join(PATHS["models_dir"], atm.replace(" ", "_") + suffix)
            joblib.dump(winner_model, path)

        print(f"  {atm}: XGBoost={xgb_smape:.1f}%  RandomForest={rf_smape:.1f}%  "
              f"-> selected {winner.upper()} ({winner_smape:.1f}%, trained on {split} rows)")

    if save:
        manifest_path = os.path.join(PATHS["models_dir"], "model_manifest.json")
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)
        print(f"  Manifest saved to: {manifest_path}")

    print(f"  Models saved to: {PATHS['models_dir']}")
    print("=" * 55)
    return models


if __name__ == "__main__":
    train_all()
