"""
branch_notebooks/run_pipeline.py
Run the full pipeline end to end, or step by step.

Usage:
  python branch_notebooks/run_pipeline.py           # full pipeline
  python branch_notebooks/run_pipeline.py --step data
  python branch_notebooks/run_pipeline.py --step model
  python branch_notebooks/run_pipeline.py --step eval
  python branch_notebooks/run_pipeline.py --step poya
"""
import sys, os, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def step_data():
    from branch_data.preprocessing import run
    return run()

def step_model(df=None):
    from branch_model.training.trainer import train_all
    return train_all(df)

def step_eval(df=None):
    from branch_model.evaluation.evaluator import evaluate_all
    return evaluate_all(df)

def step_poya():
    """Quick Poya verification."""
    from shared.poya import get_poya_calendar, poya_label, poya_multiplier
    import pandas as pd
    print("="*55)
    print("POYA SYSTEM — Verification")
    print("="*55)
    print("2025 Poya Calendar:")
    for p in get_poya_calendar(2025):
        print(f"  {p['date']} ({p['day_of_week'][:3]}) — {p['month_name']}")
    test = ["2025-01-12","2025-01-13","2025-01-14"]
    print("\nPoya multipliers:")
    for d in test:
        ts = pd.Timestamp(d)
        print(f"  {d}: {poya_label(ts):12s}  x{poya_multiplier(ts)}")
    print("="*55)

def run_all():
    print("\n" + "★"*55)
    print("  ATM CashPredict — Full Pipeline Run")
    print("★"*55)
    df = step_data()
    step_model(df)
    step_eval(df)
    step_poya()
    print("\n" + "="*55)
    print("  DONE — start the app:")
    print("  python branch_backend/app.py")
    print("="*55 + "\n")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--step", choices=["data","model","eval","poya"], default=None)
    args = p.parse_args()
    if   args.step == "data":  step_data()
    elif args.step == "model": step_model()
    elif args.step == "eval":  step_eval()
    elif args.step == "poya":  step_poya()
    else:                      run_all()
