"""
branch_model/training/compare_models.py
Honest four-model comparison: XGBoost, Random Forest, Prophet, ARIMA.
Same 80/20 chronological split per ATM, same sMAPE metric as trainer.py.
Run: python branch_model/training/compare_models.py
"""
import pandas as pd, numpy as np, warnings, sys, os, json, time
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from shared.config import PATHS, ATM_LIST, FEATURE_COLS, TARGET_COL, MODEL_PARAMS, TRAIN_SPLIT

import xgboost as xgb
from sklearn.ensemble import RandomForestRegressor


def smape(y_true, y_pred):
    return float(np.mean(2 * np.abs(y_true - y_pred) / (np.abs(y_true) + np.abs(y_pred) + 1e-8)) * 100)


def run_xgboost(X_tr, y_tr_log, X_te, y_te):
    model = xgb.XGBRegressor(**MODEL_PARAMS, verbosity=0)
    model.fit(X_tr, y_tr_log)
    preds = np.expm1(model.predict(X_te))
    return smape(y_te, preds)


def run_random_forest(X_tr, y_tr_log, X_te, y_te):
    model = RandomForestRegressor(
        n_estimators=400, max_depth=8, min_samples_leaf=5,
        random_state=42, n_jobs=-1,
    )
    model.fit(X_tr, y_tr_log)
    preds = np.expm1(model.predict(X_te))
    return smape(y_te, preds)


def run_prophet(sub, split):
    from prophet import Prophet
    train_df = sub.iloc[:split][["transaction_date", TARGET_COL]].rename(
        columns={"transaction_date": "ds", TARGET_COL: "y"})
    test_df = sub.iloc[split:]
    m = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
    import logging
    logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
    m.fit(train_df)
    future = test_df[["transaction_date"]].rename(columns={"transaction_date": "ds"})
    forecast = m.predict(future)
    preds = forecast["yhat"].values
    y_te = test_df[TARGET_COL].values
    return smape(y_te, preds)


def run_arima(sub, split):
    import pmdarima as pm
    y_tr = sub.iloc[:split][TARGET_COL].values
    y_te = sub.iloc[split:][TARGET_COL].values
    model = pm.auto_arima(
        y_tr, seasonal=True, m=7, suppress_warnings=True,
        error_action="ignore", stepwise=True, max_p=3, max_q=3,
    )
    preds = model.predict(n_periods=len(y_te))
    return smape(y_te, np.asarray(preds))


def compare_all():
    print("=" * 60)
    print("BRANCH MODEL — Four-Model Comparison")
    print("=" * 60)
    df = pd.read_csv(PATHS["processed_data"], parse_dates=["transaction_date"])
    results = {}

    for atm in ATM_LIST:
        sub = df[df["atm_name"] == atm].dropna(subset=FEATURE_COLS + [TARGET_COL])
        sub = sub[sub[TARGET_COL] > 0].sort_values("transaction_date").reset_index(drop=True)
        split = int(len(sub) * TRAIN_SPLIT)

        X_tr = sub.iloc[:split][FEATURE_COLS]
        y_tr_log = np.log1p(sub.iloc[:split][TARGET_COL])
        X_te = sub.iloc[split:][FEATURE_COLS]
        y_te = sub.iloc[split:][TARGET_COL].values

        print(f"\n--- {atm} ({len(sub)} rows, {split} train / {len(sub)-split} test) ---")
        atm_results = {}

        t0 = time.time()
        atm_results["XGBoost"] = run_xgboost(X_tr, y_tr_log, X_te, y_te)
        print(f"  XGBoost:       sMAPE={atm_results['XGBoost']:.2f}%  ({time.time()-t0:.1f}s)")

        t0 = time.time()
        atm_results["RandomForest"] = run_random_forest(X_tr, y_tr_log, X_te, y_te)
        print(f"  RandomForest:  sMAPE={atm_results['RandomForest']:.2f}%  ({time.time()-t0:.1f}s)")

        t0 = time.time()
        try:
            atm_results["Prophet"] = run_prophet(sub, split)
            print(f"  Prophet:       sMAPE={atm_results['Prophet']:.2f}%  ({time.time()-t0:.1f}s)")
        except Exception as e:
            atm_results["Prophet"] = None
            print(f"  Prophet:       FAILED ({e})")

        t0 = time.time()
        try:
            atm_results["ARIMA"] = run_arima(sub, split)
            print(f"  ARIMA:         sMAPE={atm_results['ARIMA']:.2f}%  ({time.time()-t0:.1f}s)")
        except Exception as e:
            atm_results["ARIMA"] = None
            print(f"  ARIMA:         FAILED ({e})")

        valid = {k: v for k, v in atm_results.items() if v is not None}
        winner = min(valid, key=valid.get)
        atm_results["winner"] = winner
        print(f"  -> Best for {atm}: {winner} ({valid[winner]:.2f}% sMAPE)")

        results[atm] = atm_results

    overall_avg = {}
    for model_name in ["XGBoost", "RandomForest", "Prophet", "ARIMA"]:
        vals = [results[atm][model_name] for atm in ATM_LIST if results[atm].get(model_name) is not None]
        overall_avg[model_name] = float(np.mean(vals)) if vals else None

    print("\n" + "=" * 60)
    print("OVERALL AVERAGE sMAPE ACROSS 5 ATMs")
    print("=" * 60)
    for model_name, avg in sorted(overall_avg.items(), key=lambda x: (x[1] is None, x[1])):
        print(f"  {model_name:15s}: {avg:.2f}%" if avg is not None else f"  {model_name:15s}: FAILED")

    overall_winner = min(
        (k for k, v in overall_avg.items() if v is not None),
        key=lambda k: overall_avg[k],
    )
    print(f"\nOverall best model: {overall_winner}")

    output = {
        "per_atm": results,
        "overall_average_smape": overall_avg,
        "overall_winner": overall_winner,
        "methodology": "80/20 chronological split per ATM, identical feature set, sMAPE evaluation metric",
    }
    out_path = os.path.join(PATHS["eval_dir"], "model_comparison_results.json")
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to: {out_path}")
    return output


if __name__ == "__main__":
    compare_all()
