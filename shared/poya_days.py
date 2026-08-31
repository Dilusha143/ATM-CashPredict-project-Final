"""
shared/poya_days.py
====================
Sri Lankan Poya Day Registry.

Poya days are full-moon public holidays in Sri Lanka declared by the
government at the start of each year. They shift every month because
they follow the lunar calendar — the date changes month to month.

This module:
  1. Stores known Poya dates (2011-2025)
  2. Lets any date be MARKED as a Poya day (user tick)
  3. Provides helper functions used by predictor + feature engineering
"""

import pandas as pd
import json, os

# ── Known Sri Lankan Poya Dates (2011–2025) ────────────────
# Source: Dept. of Government Printing, Sri Lanka
# Format: (year, month, day)
_KNOWN_POYA = [
    # 2011
    (2011,1,19),(2011,2,18),(2011,3,19),(2011,4,18),(2011,5,17),
    (2011,6,15),(2011,7,15),(2011,8,13),(2011,9,12),(2011,10,12),
    (2011,11,10),(2011,12,10),
    # 2012
    (2012,1,9),(2012,2,7),(2012,3,8),(2012,4,6),(2012,5,6),
    (2012,6,4),(2012,7,3),(2012,8,2),(2012,8,31),(2012,9,30),
    (2012,10,29),(2012,11,28),(2012,12,28),
    # 2013
    (2013,1,27),(2013,2,25),(2013,3,27),(2013,4,25),(2013,5,25),
    (2013,6,23),(2013,7,22),(2013,8,21),(2013,9,19),(2013,10,19),
    (2013,11,17),(2013,12,17),
    # 2014
    (2014,1,16),(2014,2,14),(2014,3,16),(2014,4,15),(2014,5,14),
    (2014,6,13),(2014,7,12),(2014,8,10),(2014,9,9),(2014,10,8),
    (2014,11,6),(2014,12,6),
    # 2015
    (2015,1,5),(2015,2,3),(2015,3,5),(2015,4,4),(2015,5,4),
    (2015,6,2),(2015,7,2),(2015,7,31),(2015,8,29),(2015,9,28),
    (2015,10,27),(2015,11,25),(2015,12,25),
    # 2016
    (2016,1,24),(2016,2,22),(2016,3,23),(2016,4,22),(2016,5,21),
    (2016,6,20),(2016,7,19),(2016,8,18),(2016,9,16),(2016,10,16),
    (2016,11,14),(2016,12,14),
    # 2017
    (2017,1,12),(2017,2,11),(2017,3,12),(2017,4,11),(2017,5,10),
    (2017,6,9),(2017,7,9),(2017,8,7),(2017,9,6),(2017,10,5),
    (2017,11,4),(2017,12,3),
    # 2018
    (2018,1,2),(2018,1,31),(2018,3,2),(2018,3,31),(2018,4,30),
    (2018,5,29),(2018,6,28),(2018,7,27),(2018,8,26),(2018,9,25),
    (2018,10,24),(2018,11,23),(2018,12,22),
    # 2019
    (2019,1,21),(2019,2,19),(2019,3,21),(2019,4,19),(2019,5,18),
    (2019,6,17),(2019,7,16),(2019,8,15),(2019,9,14),(2019,10,13),
    (2019,11,12),(2019,12,12),
    # 2020
    (2020,1,10),(2020,2,9),(2020,3,9),(2020,4,8),(2020,5,7),
    (2020,6,5),(2020,7,5),(2020,8,3),(2020,9,2),(2020,10,1),
    (2020,10,31),(2020,11,30),(2020,12,30),
    # 2021
    (2021,1,28),(2021,2,27),(2021,3,28),(2021,4,27),(2021,5,26),
    (2021,6,24),(2021,7,24),(2021,8,22),(2021,9,21),(2021,10,20),
    (2021,11,19),(2021,12,19),
    # 2022
    (2022,1,17),(2022,2,16),(2022,3,18),(2022,4,16),(2022,5,16),
    (2022,6,14),(2022,7,13),(2022,8,12),(2022,9,10),(2022,10,9),
    (2022,11,8),(2022,12,8),
    # 2023
    (2023,1,6),(2023,2,5),(2023,3,7),(2023,4,6),(2023,5,5),
    (2023,6,4),(2023,7,3),(2023,8,1),(2023,8,31),(2023,9,29),
    (2023,10,28),(2023,11,27),(2023,12,27),
    # 2024
    (2024,1,25),(2024,2,24),(2024,3,25),(2024,4,23),(2024,5,23),
    (2024,6,22),(2024,7,21),(2024,8,19),(2024,9,18),(2024,10,17),
    (2024,11,15),(2024,12,15),
    # 2025
    (2025,1,13),(2025,2,12),(2025,3,14),(2025,4,13),(2025,5,12),
    (2025,6,11),(2025,7,10),(2025,8,9),(2025,9,7),(2025,10,7),
    (2025,11,5),(2025,12,4),
]

# Build the base set of Poya timestamps
_BASE_POYA_SET = {pd.Timestamp(y, m, d) for y, m, d in _KNOWN_POYA}

# ── User-defined Poya overrides (loaded from JSON) ─────────
_OVERRIDE_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "poya_overrides.json"
)

def _load_overrides() -> dict:
    """Load user-defined Poya ticks from JSON file."""
    if os.path.exists(_OVERRIDE_FILE):
        with open(_OVERRIDE_FILE) as f:
            return json.load(f)
    return {}

def _save_overrides(overrides: dict):
    """Save user-defined Poya ticks to JSON file."""
    with open(_OVERRIDE_FILE, "w") as f:
        json.dump(overrides, f, indent=2)


# ── Public API ─────────────────────────────────────────────

def get_all_poya_dates() -> set:
    """Return the full set of Poya dates (built-in + user overrides)."""
    overrides = _load_overrides()
    extra = {pd.Timestamp(d) for d, v in overrides.items() if v}
    removed = {pd.Timestamp(d) for d, v in overrides.items() if not v}
    return (_BASE_POYA_SET | extra) - removed


def is_poya(date: pd.Timestamp) -> int:
    """Return 1 if date is a Poya day, else 0."""
    return int(date in get_all_poya_dates())


def is_pre_poya(date: pd.Timestamp) -> int:
    """Return 1 if the next day is a Poya day."""
    return int((date + pd.Timedelta(days=1)) in get_all_poya_dates())


def is_post_poya(date: pd.Timestamp) -> int:
    """Return 1 if the previous day was a Poya day."""
    return int((date - pd.Timedelta(days=1)) in get_all_poya_dates())


def set_poya(date_str: str, is_poya_flag: bool):
    """
    Mark or unmark a date as a Poya day.
    date_str: 'YYYY-MM-DD'
    is_poya_flag: True = tick (is Poya), False = untick
    """
    overrides = _load_overrides()
    ts = pd.Timestamp(date_str)

    if is_poya_flag:
        overrides[date_str] = True
    else:
        # If it's in the base set, explicitly mark as NOT Poya
        if ts in _BASE_POYA_SET:
            overrides[date_str] = False
        else:
            # Not in base set and not marking — just remove override
            overrides.pop(date_str, None)

    _save_overrides(overrides)


def get_poya_for_year(year: int) -> list:
    """
    Return all Poya dates for a given year as list of dicts.
    Includes: date, month_name, day_name, is_poya, source
    """
    all_poya = get_all_poya_dates()
    overrides = _load_overrides()
    result = []

    for month in range(1, 13):
        import calendar
        days_in_month = calendar.monthrange(year, month)[1]
        for day in range(1, days_in_month + 1):
            try:
                ts = pd.Timestamp(year, month, day)
            except Exception:
                continue
            date_str = ts.strftime("%Y-%m-%d")
            in_poya = ts in all_poya
            source = "built-in"
            if date_str in overrides:
                source = "user-defined" if overrides[date_str] else "removed"

            if in_poya:
                result.append({
                    "date":       date_str,
                    "month_name": ts.strftime("%B"),
                    "day_name":   ts.strftime("%A"),
                    "is_poya":    True,
                    "source":     source,
                })

    return sorted(result, key=lambda x: x["date"])


def get_year_calendar(year: int) -> list:
    """
    Return ALL days in a year with their Poya status.
    Used by the frontend calendar grid.
    """
    all_poya = get_all_poya_dates()
    overrides = _load_overrides()
    result = []
    import calendar

    for month in range(1, 13):
        days_in_month = calendar.monthrange(year, month)[1]
        for day in range(1, days_in_month + 1):
            ts = pd.Timestamp(year, month, day)
            date_str = ts.strftime("%Y-%m-%d")
            is_p = ts in all_poya
            user_set = date_str in overrides
            result.append({
                "date":     date_str,
                "month":    month,
                "day":      day,
                "weekday":  ts.dayofweek,
                "is_poya":  is_p,
                "user_set": user_set,
            })

    return result
