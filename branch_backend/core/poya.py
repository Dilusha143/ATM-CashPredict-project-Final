"""
branch_backend/core/poya.py
============================
Sri Lanka Poya Day system.

Poya days are full-moon public holidays declared by the Sri Lankan
government at the start of each year.  The date shifts every month
because it follows the lunar calendar.

This module:
  1. Stores known Poya dates (2011-2025)
  2. Provides is_poya(date) helper
  3. Provides predict_poya_impact(date, atm) — runs the XGBoost model
     with is_poya=1 so you can see the cash-demand forecast *as if*
     that day were a Poya holiday.
  4. Provides full-year Poya calendar so the frontend can show a
     tick on every Poya day.
"""

import pandas as pd

# ── Known Sri Lanka Poya dates 2011-2025 ──────────────────
# Source: Department of Government Printing, Sri Lanka
# Each year the government publishes the full list in January.
POYA_DATES = {
    2011: ["2011-01-19","2011-02-18","2011-03-19","2011-04-18","2011-05-17",
           "2011-06-15","2011-07-15","2011-08-13","2011-09-12","2011-10-11",
           "2011-11-10","2011-12-10"],
    2012: ["2012-01-09","2012-02-07","2012-03-08","2012-04-06","2012-05-05",
           "2012-06-04","2012-07-03","2012-08-01","2012-08-31","2012-09-29",
           "2012-10-29","2012-11-28","2012-12-28"],
    2013: ["2013-01-26","2013-02-25","2013-03-27","2013-04-25","2013-05-24",
           "2013-06-23","2013-07-22","2013-08-20","2013-09-19","2013-10-18",
           "2013-11-17","2013-12-17"],
    2014: ["2014-01-15","2014-02-14","2014-03-16","2014-04-14","2014-05-14",
           "2014-06-12","2014-07-12","2014-08-10","2014-09-08","2014-10-08",
           "2014-11-06","2014-12-06"],
    2015: ["2015-01-04","2015-02-03","2015-03-05","2015-04-04","2015-05-03",
           "2015-06-01","2015-07-01","2015-07-31","2015-08-29","2015-09-27",
           "2015-10-27","2015-11-25","2015-12-25"],
    2016: ["2016-01-23","2016-02-22","2016-03-23","2016-04-21","2016-05-21",
           "2016-06-19","2016-07-19","2016-08-17","2016-09-16","2016-10-15",
           "2016-11-14","2016-12-13"],
    2017: ["2017-01-12","2017-02-10","2017-03-12","2017-04-10","2017-05-10",
           "2017-06-08","2017-07-08","2017-08-07","2017-09-05","2017-10-05",
           "2017-11-03","2017-12-03"],
    2018: ["2018-01-01","2018-01-31","2018-03-01","2018-03-31","2018-04-29",
           "2018-05-29","2018-06-27","2018-07-27","2018-08-26","2018-09-24",
           "2018-10-24","2018-11-22","2018-12-22"],
    2019: ["2019-01-20","2019-02-19","2019-03-20","2019-04-18","2019-05-18",
           "2019-06-17","2019-07-16","2019-08-15","2019-09-13","2019-10-13",
           "2019-11-12","2019-12-11"],
    2020: ["2020-01-10","2020-02-08","2020-03-09","2020-04-07","2020-05-06",
           "2020-06-05","2020-07-04","2020-08-03","2020-09-01","2020-10-01",
           "2020-10-31","2020-11-29","2020-12-29"],
    2021: ["2021-01-28","2021-02-26","2021-03-28","2021-04-26","2021-05-25",
           "2021-06-24","2021-07-23","2021-08-22","2021-09-20","2021-10-20",
           "2021-11-18","2021-12-18"],
    2022: ["2022-01-17","2022-02-16","2022-03-18","2022-04-16","2022-05-15",
           "2022-06-14","2022-07-13","2022-08-11","2022-09-10","2022-10-09",
           "2022-11-08","2022-12-07"],
    2023: ["2023-01-06","2023-02-05","2023-03-06","2023-04-05","2023-05-05",
           "2023-06-03","2023-07-03","2023-08-01","2023-08-30","2023-09-29",
           "2023-10-28","2023-11-26","2023-12-26"],
    2024: ["2024-01-25","2024-02-23","2024-03-25","2024-04-23","2024-05-22",
           "2024-06-21","2024-07-21","2024-08-19","2024-09-17","2024-10-17",
           "2024-11-15","2024-12-14"],
    2025: ["2025-01-13","2025-02-12","2025-03-13","2025-04-12","2025-05-12",
           "2025-06-10","2025-07-10","2025-08-08","2025-09-07","2025-10-06",
           "2025-11-05","2025-12-04"],
}

# Build a flat set of Timestamps for O(1) lookup
POYA_SET = set()
for dates in POYA_DATES.values():
    for d in dates:
        POYA_SET.add(pd.Timestamp(d))


def is_poya(date: pd.Timestamp) -> bool:
    """Return True if the given date is a Sri Lanka Poya day."""
    return date in POYA_SET


def get_poya_dates_for_year(year: int) -> list:
    """Return list of Poya date strings for a given year."""
    return POYA_DATES.get(year, [])


def get_poya_calendar(year: int) -> list:
    """
    Return a list of dicts for every day of the year:
      { date, is_poya, month, day, day_of_week }
    Used by the frontend calendar view.
    """
    calendar = []
    start = pd.Timestamp(f"{year}-01-01")
    end   = pd.Timestamp(f"{year}-12-31")
    for ts in pd.date_range(start, end):
        calendar.append({
            "date":        ts.strftime("%Y-%m-%d"),
            "is_poya":     ts in POYA_SET,
            "month":       ts.month,
            "month_name":  ts.strftime("%B"),
            "day":         ts.day,
            "day_of_week": ts.strftime("%A"),
        })
    return calendar


def get_poya_summary(year: int) -> dict:
    """Return summary stats for a year's Poya days."""
    dates = POYA_DATES.get(year, [])
    return {
        "year":       year,
        "count":      len(dates),
        "dates":      dates,
        "months":     [pd.Timestamp(d).strftime("%B %d") for d in dates],
    }
