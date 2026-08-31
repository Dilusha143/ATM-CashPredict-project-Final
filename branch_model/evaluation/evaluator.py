"""
branch_model/evaluation/evaluator.py
Run: python branch_model/evaluation/evaluator.py
Evaluates all saved models and saves model_results.json.
"""
import pandas as pd, numpy as np, joblib, json, warnings, sys, os
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from shared.config import PATHS, ATM_LIST, FEATURE_COLS, TARGET_COL, TRAIN_SPLIT
from shared.utils import smape

def evaluate_all(df=None, save=True):
    print("="*55)
    print("BRANCH MODEL — Evaluation")
    print("="*55)
    if df is None:
        df = pd.read_csv(PATHS["processed_data"], parse_dates=["transaction_date"])

    manifest_path = os.path.join(PATHS["models_dir"], "model_manifest.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}

    results = {}
    for atm in ATM_LIST:
        algo = manifest.get(atm, "xgb")
        suffix = "_xgb.pkl" if algo == "xgb" else "_rf.pkl"
        path = os.path.join(PATHS["models_dir"], atm.replace(" ","_")+suffix)
        if not os.path.exists(path):
            print(f"  {atm}: model not found — skipping")
            continue

        model = joblib.load(path)
        sub   = df[df["atm_name"]==atm].dropna(subset=FEATURE_COLS+[TARGET_COL])
        sub   = sub[sub[TARGET_COL]>0].sort_values("transaction_date").reset_index(drop=True)
        split = int(len(sub)*TRAIN_SPLIT)

        X_te  = sub.iloc[split:][FEATURE_COLS]
        y_te  = sub.iloc[split:][TARGET_COL].values
        preds = np.expm1(model.predict(X_te))

        mae   = float(np.mean(np.abs(y_te-preds)))
        rmse  = float(np.sqrt(np.mean((y_te-preds)**2)))
        smv   = smape(y_te, preds)

        base  = pd.Series(sub[TARGET_COL].values).shift(1).rolling(7).mean().values[split:]
        valid = ~np.isnan(base)
        smb   = smape(y_te[valid], base[valid])
        imp   = (smb-smv)/smb*100

        results[atm] = {
            "mae":round(mae,0), "rmse":round(rmse,0),
            "smape":round(smv,2), "baseline_smape":round(smb,2),
            "improvement":round(imp,1),
            "train_rows":split, "test_rows":len(sub)-split,
            "model": "XGBoost" if algo == "xgb" else "Random Forest",
        }
        print(f"  {atm}: [{results[atm]['model']}] sMAPE={smv:.1f}% | Baseline={smb:.1f}% | {'+' if imp>0 else ''}{imp:.1f}%")

    if save:
        os.makedirs(PATHS["eval_dir"], exist_ok=True)
        out = os.path.join(PATHS["eval_dir"], "model_results.json")
        with open(out, "w") as f:
            json.dump(results, f, indent=2)
        print(f"  Saved: {out}")

    print("="*55)
    return results

if __name__ == "__main__":
    evaluate_all()
