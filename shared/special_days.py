"""
shared/special_days.py
======================
Special day demand multipliers — Christmas + other public holidays.
Follows the same pattern as Poya days.

Cash demand behaviour around Christmas:
  Dec 24 (Christmas Eve)  : +35%  — last-minute shopping withdrawals
  Dec 25 (Christmas Day)  : -15%  — holiday, banks closed
  Dec 26 (Boxing Day)     : +20%  — post-holiday spending resumes
  Dec 31 (New Year Eve)   : +40%  — party/travel spending surge
  Jan 1  (New Year Day)   : -10%  — quiet holiday
  Jan 2  (Post New Year)  : +15%  — normal resumes
"""
import pandas as pd


# ── Christmas ──────────────────────────────────────────────
def is_christmas(dt) -> bool:
    ts = pd.Timestamp(dt)
    return ts.month == 12 and ts.day == 25

def is_christmas_eve(dt) -> bool:
    ts = pd.Timestamp(dt)
    return ts.month == 12 and ts.day == 24

def is_boxing_day(dt) -> bool:
    ts = pd.Timestamp(dt)
    return ts.month == 12 and ts.day == 26

# ── New Year ───────────────────────────────────────────────
def is_new_year(dt) -> bool:
    ts = pd.Timestamp(dt)
    return ts.month == 1 and ts.day == 1

def is_new_year_eve(dt) -> bool:
    ts = pd.Timestamp(dt)
    return ts.month == 12 and ts.day == 31

def is_post_new_year(dt) -> bool:
    ts = pd.Timestamp(dt)
    return ts.month == 1 and ts.day == 2

# ── Diwali (variable — approx Oct/Nov) ────────────────────
DIWALI_DATES = {
    2011: (10,26), 2012:(11,13), 2013:(11,3),  2014:(10,23),
    2015:(11,11),  2016:(10,30), 2017:(10,19),  2018:(11,7),
    2019:(10,27),  2020:(11,14), 2021:(11,4),   2022:(10,24),
    2023:(11,12),  2024:(11,1),  2025:(10,20),  2026:(11,8),
    2027:(10,29),  2028:(10,17), 2029:(11,5),   2030:(10,26),
}

def is_diwali(dt) -> bool:
    ts  = pd.Timestamp(dt)
    mth, day = DIWALI_DATES.get(ts.year, (0,0))
    return ts.month == mth and ts.day == day

def is_pre_diwali(dt) -> bool:
    ts   = pd.Timestamp(dt)
    next_day = ts + pd.Timedelta(days=1)
    return is_diwali(next_day)

def is_post_diwali(dt) -> bool:
    ts   = pd.Timestamp(dt)
    prev_day = ts - pd.Timedelta(days=1)
    return is_diwali(prev_day)


# ══════════════════════════════════════════════════════════
# MAIN FUNCTION: get special day info for any date
# ══════════════════════════════════════════════════════════
def get_special_day_info(dt) -> dict:
    """
    Returns special day label + demand multiplier for any date.
    Returns None if not a special day.
    """
    ts = pd.Timestamp(dt)

    # Christmas cluster
    if is_christmas_eve(ts):
        return {"label":"Christmas Eve 🎄",  "type":"christmas", "multiplier":1.35, "icon":"🎄"}
    if is_christmas(ts):
        return {"label":"Christmas Day 🎅",  "type":"christmas", "multiplier":0.85, "icon":"🎅"}
    if is_boxing_day(ts):
        return {"label":"Boxing Day 🎁",     "type":"christmas", "multiplier":1.20, "icon":"🎁"}

    # New Year cluster
    if is_new_year_eve(ts):
        return {"label":"New Year Eve 🎆",   "type":"newyear",   "multiplier":1.40, "icon":"🎆"}
    if is_new_year(ts):
        return {"label":"New Year Day 🎊",   "type":"newyear",   "multiplier":0.90, "icon":"🎊"}
    if is_post_new_year(ts):
        return {"label":"Post New Year",     "type":"newyear",   "multiplier":1.15, "icon":"🗓"}

    # Diwali cluster
    if is_pre_diwali(ts):
        return {"label":"Pre-Diwali 🪔",     "type":"diwali",    "multiplier":1.30, "icon":"🪔"}
    if is_diwali(ts):
        return {"label":"Diwali 🪔",          "type":"diwali",    "multiplier":0.85, "icon":"🪔"}
    if is_post_diwali(ts):
        return {"label":"Post-Diwali",       "type":"diwali",    "multiplier":1.15, "icon":"🪔"}

    return None


def apply_special_days_to_predictions(predictions: list, date_str: str) -> dict:
    """
    Apply special day multiplier to a list of ATM predictions.
    Returns updated predictions + special day metadata.
    """
    dt   = pd.Timestamp(date_str)
    info = get_special_day_info(dt)

    if info is None:
        return {
            "predictions":      predictions,
            "special_day":      False,
            "special_label":    None,
            "special_type":     None,
            "special_multiplier": 1.0,
            "special_icon":     None,
        }

    mult = info["multiplier"]
    adjusted = []
    for p in predictions:
        base = p["predicted"]
        adj  = int(base * mult)
        adjusted.append({
            **p,
            "special_adjusted":    adj,
            "special_p10":         int(adj * 0.80),
            "special_p90":         int(adj * 1.20),
            "special_multiplier":  mult,
            "special_label":       info["label"],
        })

    return {
        "predictions":        adjusted,
        "special_day":        True,
        "special_label":      info["label"],
        "special_type":       info["type"],
        "special_multiplier": mult,
        "special_icon":       info["icon"],
    }


def get_christmas_dates(year: int) -> list:
    """Return Christmas cluster dates for a given year."""
    dates = []
    for m, d, label, mult, icon in [
        (12, 24, "Christmas Eve",  1.35, "🎄"),
        (12, 25, "Christmas Day",  0.85, "🎅"),
        (12, 26, "Boxing Day",     1.20, "🎁"),
    ]:
        ts = pd.Timestamp(year, m, d)
        dates.append({
            "date":       ts.strftime("%Y-%m-%d"),
            "label":      label,
            "icon":       icon,
            "multiplier": mult,
            "day_of_week":ts.strftime("%A"),
            "is_weekend": ts.dayofweek >= 5,
        })
    return dates


if __name__ == "__main__":
    print("=== Special Days Test ===\n")
    test = [
        "2025-12-24", "2025-12-25", "2025-12-26",
        "2025-12-31", "2026-01-01", "2026-01-02",
        "2025-10-20", "2025-10-19", "2025-10-21",
        "2025-06-15",
    ]
    for d in test:
        info = get_special_day_info(d)
        if info:
            print(f"  {d}: {info['icon']} {info['label']:25s} x{info['multiplier']}")
        else:
            print(f"  {d}: Normal day                    x1.00")


# ══════════════════════════════════════════════════════════
# SINHALA & TAMIL NEW YEAR (ALUTH AVURUDDA)
# April 14 every year — Sri Lanka's biggest cultural festival
#
# Cash demand pattern:
#   Apr 12 (2 days before): +25%  — shopping for new clothes, gifts
#   Apr 13 (day before):    +40%  — peak pre-festival withdrawals
#   Apr 14 (New Year Day):  -25%  — banks closed, celebrations
#   Apr 15 (day after):     +20%  — gifting, visiting relatives
#   Apr 16 (2 days after):  +10%  — normal life resumes
# ══════════════════════════════════════════════════════════

def is_sinhala_tamil_new_year(dt) -> bool:
    """April 14 every year — Aluth Avurudda."""
    ts = pd.Timestamp(dt)
    return ts.month == 4 and ts.day == 14

def is_pre_sinhala_new_year_1(dt) -> bool:
    """April 13 — day immediately before."""
    ts = pd.Timestamp(dt)
    return ts.month == 4 and ts.day == 13

def is_pre_sinhala_new_year_2(dt) -> bool:
    """April 12 — 2 days before."""
    ts = pd.Timestamp(dt)
    return ts.month == 4 and ts.day == 12

def is_post_sinhala_new_year_1(dt) -> bool:
    """April 15 — day after."""
    ts = pd.Timestamp(dt)
    return ts.month == 4 and ts.day == 15

def is_post_sinhala_new_year_2(dt) -> bool:
    """April 16 — 2 days after."""
    ts = pd.Timestamp(dt)
    return ts.month == 4 and ts.day == 16


def get_sinhala_new_year_info(dt) -> dict:
    """Return Sinhala & Tamil New Year demand info for a date."""
    ts = pd.Timestamp(dt)
    if is_pre_sinhala_new_year_2(ts):
        return {
            "label":      "Sinhala/Tamil New Year Eve-2 🎊",
            "short_label":"Pre New Year (Apr 12)",
            "type":       "sinhala_new_year",
            "multiplier": 1.25,
            "icon":       "🎊",
            "desc":       "Shopping surge — new clothes, gifts, sweets (+25%)",
        }
    if is_pre_sinhala_new_year_1(ts):
        return {
            "label":      "Sinhala/Tamil New Year Eve 🎉",
            "short_label":"Pre New Year (Apr 13)",
            "type":       "sinhala_new_year",
            "multiplier": 1.40,
            "icon":       "🎉",
            "desc":       "Peak withdrawal day — highest pre-festival surge (+40%)",
        }
    if is_sinhala_tamil_new_year(ts):
        return {
            "label":      "Sinhala & Tamil New Year 🌸",
            "short_label":"New Year Day (Apr 14)",
            "type":       "sinhala_new_year",
            "multiplier": 0.75,
            "icon":       "🌸",
            "desc":       "Public holiday — banks closed, very low demand (−25%)",
        }
    if is_post_sinhala_new_year_1(ts):
        return {
            "label":      "Post New Year Day 1 🙏",
            "short_label":"Post New Year (Apr 15)",
            "type":       "sinhala_new_year",
            "multiplier": 1.20,
            "icon":       "🙏",
            "desc":       "Gifting, visiting relatives — above-normal withdrawals (+20%)",
        }
    if is_post_sinhala_new_year_2(ts):
        return {
            "label":      "Post New Year Day 2 📅",
            "short_label":"Post New Year (Apr 16)",
            "type":       "sinhala_new_year",
            "multiplier": 1.10,
            "icon":       "📅",
            "desc":       "Normal life resumes (+10%)",
        }
    return None


def get_sinhala_new_year_cluster(year: int) -> list:
    """Return full 5-day cluster for a given year."""
    cluster = []
    for m, d, label, icon, mult, desc in [
        (4,12,"Pre New Year (Apr 12)", "🎊", 1.25, "Shopping surge — new clothes, gifts"),
        (4,13,"New Year Eve (Apr 13)",  "🎉", 1.40, "Peak withdrawal day"),
        (4,14,"New Year Day (Apr 14)",  "🌸", 0.75, "Banks closed — very low demand"),
        (4,15,"Post New Year (Apr 15)", "🙏", 1.20, "Gifting, visiting relatives"),
        (4,16,"Post New Year (Apr 16)", "📅", 1.10, "Normal life resumes"),
    ]:
        ts = pd.Timestamp(year, m, d)
        cluster.append({
            "date":       ts.strftime("%Y-%m-%d"),
            "label":      label,
            "icon":       icon,
            "multiplier": mult,
            "desc":       desc,
            "day_of_week":ts.strftime("%A"),
            "is_weekend": ts.dayofweek >= 5,
        })
    return cluster


# ── Update get_special_day_info to include Sinhala New Year ─
_original_get_special_day_info = get_special_day_info

def get_special_day_info(dt) -> dict:
    """Check all special days including Sinhala & Tamil New Year."""
    # Check Sinhala/Tamil New Year first (April cluster)
    info = get_sinhala_new_year_info(dt)
    if info:
        return info
    # Fall back to original checks (Christmas, New Year, Diwali)
    return _original_get_special_day_info(dt)
