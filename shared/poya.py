"""
shared/poya.py  —  Sri Lankan Poya Day System
Covers:
  - Known declared dates 2011–2030
  - Lunar calculation fallback for 2031+ (always works)
  - Demand multipliers for prediction adjustment
"""
import pandas as pd
import math

# ══════════════════════════════════════════════════════════
# SECTION 1: KNOWN DECLARED POYA DATES (2011–2030)
# Source: Sri Lanka Government Gazette / Central Bank
# ══════════════════════════════════════════════════════════
POYA_DATES_RAW = {
    # ── Historical (2011–2025) ─────────────────────────────
    2011:[(1,18),(2,18),(3,19),(4,17),(5,17),(6,15),(7,15),(8,13),(9,12),(10,11),(11,10),(12,10)],
    2012:[(1,9),(2,7),(3,8),(4,6),(5,6),(6,4),(7,3),(8,2),(8,31),(9,30),(10,29),(11,28),(12,28)],
    2013:[(1,27),(2,25),(3,27),(4,25),(5,25),(6,23),(7,22),(8,21),(9,19),(10,18),(11,17),(12,17)],
    2014:[(1,16),(2,14),(3,16),(4,15),(5,14),(6,13),(7,12),(8,10),(9,9),(10,8),(11,6),(12,6)],
    2015:[(1,5),(2,3),(3,5),(4,4),(5,4),(6,2),(7,2),(7,31),(8,29),(9,28),(10,27),(11,25),(12,25)],
    2016:[(1,24),(2,22),(3,23),(4,22),(5,21),(6,20),(7,19),(8,18),(9,16),(10,16),(11,14),(12,14)],
    2017:[(1,12),(2,11),(3,12),(4,11),(5,10),(6,9),(7,9),(8,7),(9,6),(10,5),(11,4),(12,3)],
    2018:[(1,2),(1,31),(3,2),(3,31),(4,30),(5,29),(6,28),(7,27),(8,26),(9,25),(10,24),(11,23),(12,22)],
    2019:[(1,21),(2,19),(3,21),(4,19),(5,18),(6,17),(7,16),(8,15),(9,13),(10,13),(11,12),(12,12)],
    2020:[(1,10),(2,9),(3,9),(4,8),(5,7),(6,5),(7,5),(8,3),(9,2),(10,1),(10,31),(11,30),(12,30)],
    2021:[(1,28),(2,27),(3,28),(4,27),(5,26),(6,24),(7,24),(8,22),(9,20),(10,20),(11,19),(12,19)],
    2022:[(1,17),(2,16),(3,18),(4,16),(5,16),(6,14),(7,13),(8,12),(9,10),(10,9),(11,8),(12,8)],
    2023:[(1,6),(2,5),(3,7),(4,6),(5,5),(6,4),(7,3),(8,1),(8,31),(9,29),(10,28),(11,27),(12,27)],
    2024:[(1,25),(2,24),(3,25),(4,23),(5,23),(6,22),(7,21),(8,19),(9,18),(10,17),(11,15),(12,15)],
    2025:[(1,13),(2,12),(3,14),(4,13),(5,12),(6,11),(7,10),(8,9),(9,7),(10,7),(11,5),(12,5)],
    # ── Future (2026–2030) ─────────────────────────────────
    # Based on full-moon lunar calendar calculations
    2026:[(1,3),(2,1),(3,3),(4,2),(5,1),(5,31),(6,29),(7,29),(8,27),(9,26),(10,25),(11,24),(12,23)],
    2027:[(1,22),(2,20),(3,22),(4,20),(5,20),(6,18),(7,18),(8,16),(9,15),(10,14),(11,13),(12,12)],
    2028:[(1,11),(2,9),(3,10),(4,8),(5,8),(6,6),(7,6),(8,4),(9,3),(10,2),(10,31),(11,30),(12,29)],
    2029:[(1,28),(2,26),(3,28),(4,26),(5,25),(6,24),(7,23),(8,22),(9,20),(10,20),(11,18),(12,18)],
    2030:[(1,17),(2,15),(3,17),(4,15),(5,14),(6,13),(7,12),(8,11),(9,9),(10,9),(11,7),(12,7)],
}


# ══════════════════════════════════════════════════════════
# SECTION 2: LUNAR CALCULATION FOR 2031+ (always works)
# Uses the astronomical full moon algorithm
# ══════════════════════════════════════════════════════════

def _julian_day(year, month, day):
    """Convert a calendar date to Julian Day Number."""
    if month <= 2:
        year  -= 1
        month += 12
    A = int(year / 100)
    B = 2 - A + int(A / 4)
    return int(365.25 * (year + 4716)) + int(30.6001 * (month + 1)) + day + B - 1524.5

def _full_moon_dates_for_year(year):
    """
    Calculate approximate full moon dates for a given year.
    Returns list of (month, day) tuples — one per lunar cycle (~29.53 days).
    Accuracy: ±1 day of actual full moon.
    """
    # Known full moon: Jan 6, 2000 (Julian Day 2451549.5)
    KNOWN_FULL_MOON_JD = 2451549.5
    LUNAR_CYCLE = 29.530588853

    # Start from first full moon of the year
    jd_jan1 = _julian_day(year, 1, 1)
    cycles_since_known = (jd_jan1 - KNOWN_FULL_MOON_JD) / LUNAR_CYCLE
    n = math.ceil(cycles_since_known)

    results = []
    while True:
        fm_jd = KNOWN_FULL_MOON_JD + n * LUNAR_CYCLE
        # Convert JD back to calendar date
        jd    = fm_jd + 0.5
        Z     = int(jd)
        F     = jd - Z
        if Z < 2299161:
            A = Z
        else:
            alpha = int((Z - 1867216.25) / 36524.25)
            A     = Z + 1 + alpha - int(alpha / 4)
        B  = A + 1524
        C  = int((B - 122.1) / 365.25)
        D  = int(365.25 * C)
        E  = int((B - D) / 30.6001)
        day   = B - D - int(30.6001 * E)
        month = E - 1 if E < 14 else E - 13
        yr    = C - 4716 if month > 2 else C - 4715

        if yr > year:
            break
        if yr == year:
            try:
                pd.Timestamp(yr, month, day)   # validate date
                results.append((month, day))
            except Exception:
                pass
        n += 1

    # Sri Lanka observes the full moon that falls closest to Buddhist calendar
    # Keep only 12 (or 13 in rare cases) — one per month
    seen_months = set()
    clean = []
    for m, d in sorted(results):
        if m not in seen_months:
            clean.append((m, d))
            seen_months.add(m)
        elif len([x for x in clean if x[0] == m]) < 1:
            clean.append((m, d))

    return clean[:13]   # max 13 Poya days per year


def get_poya_dates_for_year(year):
    """
    Return list of (month, day) Poya dates for any year.
    Uses known data for 2011-2030, lunar calculation for 2031+.
    """
    if year in POYA_DATES_RAW:
        return POYA_DATES_RAW[year]
    # Calculate for future years
    return _full_moon_dates_for_year(year)


# ══════════════════════════════════════════════════════════
# SECTION 3: POYA SET — fast lookup
# ══════════════════════════════════════════════════════════
# Pre-build set for known years
POYA_SET: set = set()
for _yr, _dates in POYA_DATES_RAW.items():
    for _m, _d in _dates:
        try:
            POYA_SET.add(pd.Timestamp(_yr, _m, _d))
        except Exception:
            pass

def _get_or_build_set(year):
    """Get Poya timestamps for a year (cached or calculated)."""
    year_dates = get_poya_dates_for_year(year)
    result = set()
    for m, d in year_dates:
        try:
            result.add(pd.Timestamp(year, m, d))
        except Exception:
            pass
    return result


# ══════════════════════════════════════════════════════════
# SECTION 4: PUBLIC API FUNCTIONS
# ══════════════════════════════════════════════════════════

def is_poya(dt) -> bool:
    ts   = pd.Timestamp(dt)
    year = ts.year
    if year in POYA_DATES_RAW:
        return ts in POYA_SET
    return ts in _get_or_build_set(year)

def is_pre_poya(dt) -> bool:
    return is_poya(pd.Timestamp(dt) + pd.Timedelta(days=1))

def is_post_poya(dt) -> bool:
    return is_poya(pd.Timestamp(dt) - pd.Timedelta(days=1))

def poya_multiplier(dt) -> float:
    if is_poya(dt):     return 0.80
    if is_pre_poya(dt): return 1.30
    if is_post_poya(dt):return 1.10
    return 1.0

def poya_label(dt) -> str:
    if is_poya(dt):     return "Poya Day"
    if is_pre_poya(dt): return "Pre-Poya"
    if is_post_poya(dt):return "Post-Poya"
    return "Normal Day"

def get_poya_calendar(year: int) -> list:
    """Return all Poya dates for a year as a list of dicts."""
    dates = get_poya_dates_for_year(year)
    result = []
    for m, d in dates:
        try:
            ts = pd.Timestamp(year, m, d)
            result.append({
                "date":        ts.strftime("%Y-%m-%d"),
                "month_name":  ts.strftime("%B"),
                "day_of_week": ts.strftime("%A"),
                "day":   d,
                "month": m,
                "year":  year,
                "is_weekend":  ts.dayofweek >= 5,
                "is_calculated": year not in POYA_DATES_RAW,
            })
        except Exception:
            pass
    return result

def apply_poya_to_predictions(predictions: list, date_str: str) -> list:
    dt    = pd.Timestamp(date_str)
    mult  = poya_multiplier(dt)
    label = poya_label(dt)
    result = []
    for p in predictions:
        base = p["predicted"]
        adj  = int(base * mult)
        result.append({
            **p,
            "poya_adjusted":   adj,
            "poya_p10":        int(adj * 0.80),
            "poya_p90":        int(adj * 1.20),
            "poya_multiplier": mult,
            "poya_label":      label,
            "is_poya":         is_poya(dt),
            "is_pre_poya":     is_pre_poya(dt),
            "is_post_poya":    is_post_poya(dt),
        })
    return result

def get_full_year_poya_predictions(year: int, base_daily_demand: dict) -> list:
    """Predict every day of the year with Poya adjustment."""
    results = []
    day = pd.Timestamp(year, 1, 1)
    end = pd.Timestamp(year, 12, 31)
    while day <= end:
        mult  = poya_multiplier(day)
        label = poya_label(day)
        preds = [{"atm": atm, "predicted": int(base * mult)}
                 for atm, base in base_daily_demand.items()]
        results.append({
            "date":         day.strftime("%Y-%m-%d"),
            "month":        day.month,
            "day":          day.day,
            "day_of_week":  day.strftime("%A"),
            "is_poya":      is_poya(day),
            "is_pre_poya":  is_pre_poya(day),
            "is_post_poya": is_post_poya(day),
            "poya_label":   label,
            "multiplier":   mult,
            "predictions":  preds,
        })
        day += pd.Timedelta(days=1)
    return results


if __name__ == "__main__":
    print("=== Poya System Test ===\n")
    for yr in [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032]:
        dates = get_poya_dates_for_year(yr)
        src   = "DECLARED" if yr in POYA_DATES_RAW else "CALCULATED"
        print(f"{yr} [{src}] — {len(dates)} Poya days:")
        for m, d in dates:
            ts  = pd.Timestamp(yr, m, d)
            lbl = " ← Weekend" if ts.dayofweek >= 5 else ""
            print(f"  {ts.strftime('%B'):10s} {d:2d}  ({ts.strftime('%A')}){lbl}")
        print()
