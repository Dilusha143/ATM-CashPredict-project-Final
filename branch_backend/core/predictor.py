"""
branch_backend/core/predictor.py  —  ATM prediction engine
"""
import pandas as pd, numpy as np, joblib, json, warnings, sys, os
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from shared.config import PATHS, ATM_LIST, ZONE_MAP, FEATURE_COLS, INDIA_HOLIDAYS, P10_FACTOR, P90_FACTOR
from shared.utils import build_features_for_date

class ATMPredictor:
    def __init__(self):
        self.models  = self._load_models()
        self.df      = pd.read_csv(PATHS["processed_data"], parse_dates=["transaction_date"])
        self.results = self._load_eval()
        print(f"  ATMPredictor ready — {len(self.models)}/{len(ATM_LIST)} models loaded")

    def _load_models(self):
        m = {}
        manifest_path = os.path.join(PATHS["models_dir"], "model_manifest.json")
        manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
        self.model_manifest = manifest
        for atm in ATM_LIST:
            algo = manifest.get(atm, "xgb")  # default to xgb if no manifest (old projects)
            suffix = "_xgb.pkl" if algo == "xgb" else "_rf.pkl"
            p = os.path.join(PATHS["models_dir"], atm.replace(" ","_")+suffix)
            if os.path.exists(p):
                m[atm] = joblib.load(p)
            else:
                # fallback: try the other suffix in case manifest and files disagree
                alt = os.path.join(PATHS["models_dir"], atm.replace(" ","_")+("_rf.pkl" if suffix=="_xgb.pkl" else "_xgb.pkl"))
                if os.path.exists(alt):
                    m[atm] = joblib.load(alt)
        return m

    def _load_eval(self):
        p = os.path.join(PATHS["eval_dir"], "model_results.json")
        return json.load(open(p)) if os.path.exists(p) else {}

    def predict(self, date_str, atm_filter="all", is_holiday_override="auto"):
        td   = pd.Timestamp(date_str)
        atms = ATM_LIST if atm_filter == "all" else [atm_filter]
        is_hol = (int(td in INDIA_HOLIDAYS)
                  if is_holiday_override == "auto" else int(is_holiday_override))
        preds = []
        for atm in atms:
            if atm not in self.models: continue
            X = build_features_for_date(self.df, atm, td, is_holiday_override)
            if X is None: continue
            pred = max(0, int(np.expm1(self.models[atm].predict(X)[0])))
            preds.append({
                "atm": atm, "zone": ZONE_MAP.get(atm, "unknown"),
                "predicted": pred,
                "p10": int(pred * P10_FACTOR),
                "p90": int(pred * P90_FACTOR),
            })
        return {"date": date_str, "is_holiday": is_hol,
                "is_salary_day": int(td.day == 1), "predictions": preds}

    def get_history(self, atm, days=90):
        sub = self.df[self.df["atm_name"]==atm].sort_values("transaction_date").tail(days)
        return {"atm": atm,
                "dates":  sub["transaction_date"].dt.strftime("%d %b").tolist(),
                "values": sub["total_amount_withdrawn"].round(0).tolist()}

    def get_atm_stats(self):
        stats = {}
        for atm in ATM_LIST:
            sub = self.df[self.df["atm_name"]==atm]["total_amount_withdrawn"]
            mr  = self.results.get(atm, {})
            algo = self.model_manifest.get(atm, "xgb")
            stats[atm] = {
                "zone":        ZONE_MAP.get(atm, "unknown"),
                "mean":        round(float(sub.mean()), 0),
                "max":         round(float(sub.max()), 0),
                "min":         round(float(sub.min()), 0),
                "smape":       mr.get("smape", "N/A"),
                "baseline":    mr.get("baseline_smape", "N/A"),
                "improvement": mr.get("improvement", 0),
                "mae":         mr.get("mae", "N/A"),
                "model":       "XGBoost" if algo == "xgb" else "Random Forest",
            }
        return stats

    def get_missing_dates(self, atm):
        raw = pd.read_csv(PATHS["raw_data"])
        raw["transaction_date"] = pd.to_datetime(raw["transaction_date"], format="%d/%m/%Y", errors="coerce")
        sub  = raw[raw["atm_name"]==atm].set_index("transaction_date")
        full = pd.date_range(sub.index.min(), sub.index.max(), freq="D")
        miss = full.difference(sub.index)
        return {"atm": atm, "count": len(miss),
                "dates": [d.strftime("%Y-%m-%d") for d in miss]}
