"""
branch_backend/api/routes.py  —  All Flask API routes (Prediction + Poya endpoints)

Authentication: Firebase-based with Flask sessions
  - All protected endpoints require @require_login decorator
  - UserID stored in Flask session after successful /auth/login
  - See branch_backend/api/auth_routes.py for auth endpoints
"""
from flask import Blueprint, request, jsonify
import sys, os
import pandas as pd
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from shared.config import ATM_LIST
from shared.poya import (
    get_poya_calendar, is_poya, is_pre_poya, is_post_poya,
    poya_label, poya_multiplier,
    apply_poya_to_predictions, get_full_year_poya_predictions,
)
from branch_backend.api.auth import require_login

api        = Blueprint("api", __name__)
_predictor = None

def init_predictor(p):
    global _predictor
    _predictor = p


# ── Standard prediction routes ─────────────────────────────
@api.route("/predict", methods=["POST", "OPTIONS"])
@require_login
def predict():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        d = request.get_json() or {}
        return jsonify(_predictor.predict(
            d["pred_date"], d.get("atm_select", "all"), d.get("is_holiday", "auto")))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api.route("/history", methods=["GET", "OPTIONS"])
@require_login
def history():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        return jsonify(_predictor.get_history(
            request.args.get("atm", ATM_LIST[0]),
            int(request.args.get("days", 90))))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api.route("/atm_stats", methods=["GET", "OPTIONS"])
@require_login
def atm_stats():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        return jsonify(_predictor.get_atm_stats())
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api.route("/missing_dates", methods=["GET", "OPTIONS"])
@require_login
def missing_dates():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        return jsonify(_predictor.get_missing_dates(
            request.args.get("atm", ATM_LIST[0])))
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models_loaded": len(_predictor.models) if _predictor else 0,
        "atm_count": len(ATM_LIST),
    })

# ── Poya Day routes ────────────────────────────────────────
@api.route("/poya/calendar", methods=["GET", "OPTIONS"])
@require_login
def poya_calendar():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        year = int(request.args.get("year", 2025))
        cal  = get_poya_calendar(year)
        return jsonify({"year": year, "poya_dates": cal, "count": len(cal)})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api.route("/poya/check", methods=["GET", "OPTIONS"])
@require_login
def poya_check():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        dt = pd.Timestamp(request.args.get("date"))
        return jsonify({
            "date":         request.args.get("date"),
            "is_poya":      is_poya(dt),
            "is_pre_poya":  is_pre_poya(dt),
            "is_post_poya": is_post_poya(dt),
            "label":        poya_label(dt),
            "multiplier":   poya_multiplier(dt),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api.route("/poya/predict", methods=["POST", "OPTIONS"])
@require_login
def poya_predict():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        d        = request.get_json() or {}
        date_str = d["pred_date"]
        base     = _predictor.predict(
            date_str, d.get("atm_select", "all"), d.get("is_holiday", "auto"))
        adjusted = apply_poya_to_predictions(base["predictions"], date_str)
        dt       = pd.Timestamp(date_str)
        return jsonify({
            **base,
            "predictions":     adjusted,
            "is_poya":         is_poya(dt),
            "is_pre_poya":     is_pre_poya(dt),
            "is_post_poya":    is_post_poya(dt),
            "poya_label":      poya_label(dt),
            "poya_multiplier": poya_multiplier(dt),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api.route("/poya/year_predictions", methods=["GET", "OPTIONS"])
@require_login
def poya_year_predictions():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        year  = int(request.args.get("year", 2025))
        stats = _predictor.get_atm_stats()
        base  = {atm: int(info["mean"]) for atm, info in stats.items()}
        days  = get_full_year_poya_predictions(year, base)
        return jsonify({"year": year, "days": days, "total_days": len(days)})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ══════════════════════════════════════════════════════════
# SPECIAL DAY ROUTES (Christmas, New Year, Diwali)
# ══════════════════════════════════════════════════════════
from shared.special_days import (
    get_special_day_info, apply_special_days_to_predictions,
    get_christmas_dates
)

@api.route("/special/check", methods=["GET","OPTIONS"])
@require_login
def special_check():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        date_str = request.args.get("date")
        info     = get_special_day_info(date_str)
        return jsonify({
            "date":         date_str,
            "is_special":   info is not None,
            "special_day":  info,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api.route("/special/predict", methods=["POST","OPTIONS"])
@require_login
def special_predict():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        d        = request.get_json() or {}
        date_str = d["pred_date"]
        # Get base prediction first
        base     = _predictor.predict(
            date_str, d.get("atm_select","all"), d.get("is_holiday","auto"))
        # Apply special day multiplier
        result   = apply_special_days_to_predictions(base["predictions"], date_str)
        return jsonify({ **base, **result })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api.route("/special/christmas", methods=["GET","OPTIONS"])
@require_login
def special_christmas():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        year  = int(request.args.get("year", 2025))
        dates = get_christmas_dates(year)
        return jsonify({"year": year, "christmas_dates": dates})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ── Sinhala & Tamil New Year routes ───────────────────────
from shared.special_days import get_sinhala_new_year_cluster, get_sinhala_new_year_info

@api.route("/special/sinhala_new_year", methods=["GET","OPTIONS"])
@require_login
def sinhala_new_year():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        year    = int(request.args.get("year", 2025))
        cluster = get_sinhala_new_year_cluster(year)
        return jsonify({"year": year, "cluster": cluster, "new_year_date": f"{year}-04-14"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api.route("/special/sinhala_predict", methods=["POST","OPTIONS"])
@require_login
def sinhala_predict():
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        d        = request.get_json() or {}
        date_str = d["pred_date"]
        base     = _predictor.predict(
            date_str, d.get("atm_select","all"), d.get("is_holiday","auto"))
        result   = apply_special_days_to_predictions(base["predictions"], date_str)
        info     = get_sinhala_new_year_info(date_str)
        return jsonify({
            **base, **result,
            "is_sinhala_new_year": info is not None,
            "sinhala_info": info,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ══════════════════════════════════════════════════════════
# 7-DAY FORECAST ROUTE
# ══════════════════════════════════════════════════════════
from shared.poya import is_poya, is_pre_poya, is_post_poya, poya_label, poya_multiplier
from shared.special_days import get_special_day_info, get_sinhala_new_year_info
import pandas as _pd_forecast

def _get_day_flags(date_str: str) -> dict:
    """
    Build a full flag dict for one date covering:
    - Poya / pre-poya / post-poya
    - Sinhala New Year cluster
    - Christmas / New Year / Diwali
    - Salary day (1st and last day of month)
    - Weekend / weekday
    Returns the highest-priority label + combined multiplier.
    """
    dt      = _pd_forecast.Timestamp(date_str)
    flags   = []
    mult    = 1.0
    label   = "Normal"
    icon    = "📅"
    color   = "#9B9BAE"

    # Poya cluster
    if is_poya(dt):
        flags.append("poya"); mult *= poya_multiplier(dt)
        label = "Poya Day"; icon = "🌕"; color = "#FBBF24"
    elif is_pre_poya(dt):
        flags.append("pre_poya"); mult *= poya_multiplier(dt)
        label = "Pre-Poya"; icon = "🌔"; color = "#6EE7B7"
    elif is_post_poya(dt):
        flags.append("post_poya"); mult *= poya_multiplier(dt)
        label = "Post-Poya"; icon = "🌖"; color = "#60A5FA"

    # Sinhala New Year
    sn_info = get_sinhala_new_year_info(dt)
    if sn_info:
        flags.append("sinhala_new_year")
        if label == "Normal":
            mult  *= sn_info["multiplier"]
            label  = sn_info["short_label"]
            icon   = sn_info["icon"]
            color  = "#F59E0B"
        else:
            mult  *= sn_info["multiplier"]   # combine both effects

    # Christmas / New Year / Diwali
    sp_info = get_special_day_info(dt)
    if sp_info and "sinhala" not in sp_info.get("type", ""):
        flags.append("special")
        if label == "Normal":
            mult  *= sp_info["multiplier"]
            label  = sp_info["label"]
            icon   = sp_info["icon"]
            color  = "#EF4444" if "christmas" in sp_info.get("type","") else "#A855F7"
        else:
            mult  *= sp_info["multiplier"]

    # Salary day (1st of month or last day of month)
    is_salary = dt.day == 1 or dt == dt + _pd_forecast.offsets.MonthEnd(0)
    if is_salary:
        flags.append("salary")
        if label == "Normal":
            label = "Salary Day"; icon = "💰"; color = "#10B981"
            mult *= 1.22

    # Weekend
    is_wknd = dt.dayofweek >= 5
    if is_wknd:
        flags.append("weekend")
        if label == "Normal":
            label = "Weekend"; icon = "📅"; color = "#9B9BAE"

    return {
        "date":       date_str,
        "day_name":   dt.strftime("%A"),
        "day_short":  dt.strftime("%a"),
        "day_num":    dt.day,
        "month_name": dt.strftime("%B"),
        "flags":      flags,
        "label":      label,
        "icon":       icon,
        "color":      color,
        "multiplier": round(mult, 2),
        "is_weekend": is_wknd,
        "is_salary":  is_salary,
        "is_poya":    "poya"    in flags,
        "is_special": "special" in flags or "sinhala_new_year" in flags,
    }


@api.route("/forecast/week", methods=["POST", "OPTIONS"])
@require_login
def forecast_week():
    """
    7-day ATM cash demand forecast starting from a given date.
    Returns per-day predictions for all 5 ATMs with all flags applied.
    """
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        d          = request.get_json() or {}
        start_str  = d.get("start_date")
        atm_filter = d.get("atm_select", "all")

        start = _pd_forecast.Timestamp(start_str)
        days  = []

        for i in range(7):
            day_ts   = start + _pd_forecast.Timedelta(days=i)
            date_str = day_ts.strftime("%Y-%m-%d")

            # Get base XGBoost prediction
            base_result = _predictor.predict(
                date_str, atm_filter,
                "1" if _get_day_flags(date_str)["is_poya"] else "auto"
            )

            # Apply all special day multipliers
            day_flags = _get_day_flags(date_str)
            mult      = day_flags["multiplier"]

            atm_preds = []
            for p in base_result["predictions"]:
                adj = int(p["predicted"] * mult)
                atm_preds.append({
                    "atm":       p["atm"],
                    "zone":      p["zone"],
                    "base":      p["predicted"],
                    "predicted": adj,
                    "p10":       int(adj * 0.80),
                    "p90":       int(adj * 1.20),
                })

            days.append({
                **day_flags,
                "predictions":  atm_preds,
                "total_demand": sum(p["predicted"] for p in atm_preds),
                "total_base":   sum(p["base"]      for p in atm_preds),
            })

        return jsonify({
            "start_date":   start_str,
            "end_date":     (start + _pd_forecast.Timedelta(days=6)).strftime("%Y-%m-%d"),
            "days":         days,
            "total_7day":   sum(d["total_demand"] for d in days),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ══════════════════════════════════════════════════════════
# LOW CASH ALERT SYSTEM
# Bank enters current cash level per ATM.
# System compares against 7-day forecast and raises alerts.
# ══════════════════════════════════════════════════════════
import json as _json_alert

# In-memory store for cash levels (resets on server restart)
# In production, replace with a database
_CASH_LEVELS = {
    "Airport ATM":        0,
    "Big Street ATM":     0,
    "Christ College ATM": 0,
    "KK Nagar ATM":       0,
    "Mount Road ATM":     0,
}

@api.route("/alerts/cash_levels", methods=["GET","OPTIONS"])
@require_login
def get_cash_levels():
    """Get current cash level for all ATMs."""
    if request.method == "OPTIONS": return jsonify({}), 200
    return jsonify({"cash_levels": _CASH_LEVELS})

@api.route("/alerts/cash_levels", methods=["POST","OPTIONS"])
@require_login
def set_cash_levels():
    """Set current cash level for one or all ATMs."""
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        data = request.get_json() or {}
        levels = data.get("cash_levels", {})
        for atm, amount in levels.items():
            if atm in _CASH_LEVELS:
                _CASH_LEVELS[atm] = int(amount)
        return jsonify({"message": "Cash levels updated", "cash_levels": _CASH_LEVELS})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@api.route("/alerts/check", methods=["POST","OPTIONS"])
@require_login
def check_alerts():
    """
    Run alert check for next N days.
    For each day, compare predicted demand against current cash level.
    Returns list of alerts with severity:
      CRITICAL — demand > 90% of loaded cash
      WARNING  — demand > 75% of loaded cash
      OK       — demand <= 75% of loaded cash
    """
    if request.method == "OPTIONS": return jsonify({}), 200
    try:
        d           = request.get_json() or {}
        start_str   = d.get("start_date")
        days_ahead  = int(d.get("days", 7))
        custom_levels = d.get("cash_levels", None)

        # Use provided levels or stored levels
        levels = custom_levels if custom_levels else _CASH_LEVELS

        start = _pd_forecast.Timestamp(start_str)
        alerts = []
        summary = {"critical":0, "warning":0, "ok":0, "total_days":0}

        for i in range(days_ahead):
            day_ts   = start + _pd_forecast.Timedelta(days=i)
            date_str = day_ts.strftime("%Y-%m-%d")

            # Get prediction for this day
            base_result = _predictor.predict(date_str, "all", "auto")
            day_flags   = _get_day_flags(date_str)
            mult        = day_flags["multiplier"]

            atm_alerts = []
            for p in base_result["predictions"]:
                adj        = int(p["predicted"] * mult)
                loaded     = int(levels.get(p["atm"], 0))
                p90        = int(adj * 1.20)

                if loaded == 0:
                    severity = "NO_DATA"
                    pct      = None
                elif adj > loaded:
                    severity = "CRITICAL"
                    pct      = round(adj / loaded * 100, 1)
                elif adj > loaded * 0.75:
                    severity = "WARNING"
                    pct      = round(adj / loaded * 100, 1)
                else:
                    severity = "OK"
                    pct      = round(adj / loaded * 100, 1)

                shortfall = max(0, adj - loaded)
                p90_shortfall = max(0, p90 - loaded)

                atm_alerts.append({
                    "atm":          p["atm"],
                    "zone":         p["zone"],
                    "loaded":       loaded,
                    "predicted":    adj,
                    "p90":          p90,
                    "shortfall":    shortfall,
                    "p90_shortfall":p90_shortfall,
                    "usage_pct":    pct,
                    "severity":     severity,
                    "needs_refill": shortfall > 0,
                })

                if severity == "CRITICAL":
                    summary["critical"] += 1
                elif severity == "WARNING":
                    summary["warning"]  += 1
                elif severity == "OK":
                    summary["ok"]       += 1

            summary["total_days"] += 1

            # Only include in alerts if at least one ATM has an issue
            critical_atms = [a for a in atm_alerts if a["severity"] in ("CRITICAL","WARNING")]
            alerts.append({
                **day_flags,
                "atm_alerts":     atm_alerts,
                "critical_count": len([a for a in atm_alerts if a["severity"]=="CRITICAL"]),
                "warning_count":  len([a for a in atm_alerts if a["severity"]=="WARNING"]),
                "total_refill":   sum(a["shortfall"] for a in atm_alerts),
                "has_issue":      len(critical_atms) > 0,
            })

        return jsonify({
            "start_date":   start_str,
            "days":         alerts,
            "summary":      summary,
            "cash_levels":  levels,
            "has_alerts":   summary["critical"] > 0 or summary["warning"] > 0,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400
