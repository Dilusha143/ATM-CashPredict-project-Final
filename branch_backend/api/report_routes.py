"""
branch_backend/api/report_routes.py
=====================================
Weekly Cash Replenishment Report — Flask routes.
Firebase authentication with Flask sessions.

Register in app.py:

    from branch_backend.api.report_routes import report_api, init_report_predictor
    init_report_predictor(predictor)
    app.register_blueprint(report_api)

Endpoints
---------
GET /report/weekly?week_start=2026-06-22
    → Downloads ATM_CashPredict_Report_<date>.xlsx (requires login)

GET /report/preview?week_start=2026-06-22
    → Returns JSON summary (requires login)
"""

import os, sys, tempfile
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, send_file

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from branch_backend.api.auth import require_login

# Import the report generator — lives alongside the backend
_REPORT_GEN = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "branch_backend", "reports", "report_generator.py"
)
import importlib.util
_spec = importlib.util.spec_from_file_location("report_generator", _REPORT_GEN)
_rg   = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_rg)

report_api  = Blueprint("report_api", __name__)
_predictor  = None

def init_report_predictor(p):
    global _predictor
    _predictor = p


def _parse_week_start(raw: str | None) -> datetime:
    """Parse ?week_start=YYYY-MM-DD or default to this Monday."""
    if raw:
        try:
            return datetime.strptime(raw, "%Y-%m-%d")
        except ValueError:
            pass
    today = datetime.today()
    return today - timedelta(days=today.weekday())


# ── Download endpoint ─────────────────────────────────────────────────────────
@report_api.route("/report/weekly", methods=["GET", "OPTIONS"])
@require_login
def weekly_report():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    week_start = _parse_week_start(request.args.get("week_start"))

    try:
        tmp_dir   = tempfile.mkdtemp()
        fname     = f"ATM_CashPredict_Report_{week_start.strftime('%Y-%m-%d')}.xlsx"
        out_path  = os.path.join(tmp_dir, fname)

        _rg.generate_report(
            week_start  = week_start,
            predictor   = _predictor,
            output_path = out_path,
        )

        return send_file(
            out_path,
            as_attachment         = True,
            download_name         = fname,
            mimetype              = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── JSON preview endpoint ─────────────────────────────────────────────────────
@report_api.route("/report/preview", methods=["GET", "OPTIONS"])
@require_login
def weekly_preview():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    week_start = _parse_week_start(request.args.get("week_start"))
    week_end   = week_start + timedelta(days=6)

    try:
        rows     = _rg.build_week_predictions(week_start, _predictor)
        import pandas as pd
        df       = pd.DataFrame(rows)

        atm_summaries = []
        for atm in _rg.ATMS:
            sub  = df[df["atm"] == atm]
            atm_summaries.append({
                "atm":           atm,
                "zone":          _rg.ZONE_MAP[atm],
                "weekly_total":  int(sub["adjusted"].sum()),
                "peak_day":      sub.loc[sub["adjusted"].idxmax(), "date"].strftime("%A"),
                "poya_days":     int(sub["poya_label"].eq("Poya Day").sum()),
                "critical_days": int(sub["alert_name"].str.startswith("C4").sum()),
                "high_days":     int(sub["alert_name"].str.startswith("C3").sum()),
            })

        poya_dates = [
            r["date"].strftime("%A %d %b")
            for r in rows
            if r["poya_label"] == "Poya Day" and r["atm"] == _rg.ATMS[0]
        ]
        holidays = list({
            r["date"].strftime("%d %b") + " – " + r["holiday"]
            for r in rows if r["holiday"]
        })

        return jsonify({
            "week_start":    week_start.strftime("%Y-%m-%d"),
            "week_end":      week_end.strftime("%Y-%m-%d"),
            "report_label":  f"w/c {week_start.strftime('%d %b %Y')}",
            "grand_total":   int(df["adjusted"].sum()),
            "poya_days":     poya_dates,
            "holidays":      holidays,
            "atm_summaries": atm_summaries,
            "download_url":  f"/report/weekly?week_start={week_start.strftime('%Y-%m-%d')}",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
