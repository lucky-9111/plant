"""Shared helpers for the admin analytics endpoints (app/routers/api_admin_analytics.py).
All `created_at`/`purchase_date` columns app-wide are stored as naive UTC
(`datetime.utcnow()`), but the nursery's business timezone is IST (UTC+5:30).
Bucketing "Today"/"This Month"/etc. directly against raw UTC values would
misclassify anything placed after 6:30pm IST into the wrong day -- every helper
below shifts to IST before bucketing or computing "now".
"""
from datetime import datetime, timedelta

from sqlalchemy import func

IST = timedelta(hours=5, minutes=30)

# Tunable thresholds -- single edit point if the business wants different cutoffs.
LOW_STOCK_THRESHOLD = 20
FAST_MOVING_UNITS_90D = 20
INACTIVE_DAYS = 90
NEW_CUSTOMER_DAYS = 30
VIP_SPEND_THRESHOLD = 15000
VIP_ORDER_COUNT = 10

def local_dt(column):
    """Shift a naive-UTC DateTime column to IST before any strftime bucketing.
    SQLite's datetime() requires each modifier as a separate argument -- a single
    combined string like "+5 hours 30 minutes" is invalid and silently returns
    NULL (confirmed: it doesn't raise, every row just buckets into a NULL group,
    which looks like "no data" rather than an obvious error)."""
    return func.datetime(column, "+5 hours", "+30 minutes")

def day_bucket(column):
    return func.strftime("%Y-%m-%d", local_dt(column))

def week_bucket(column):
    return func.strftime("%Y-W%W", local_dt(column))

def month_bucket(column):
    return func.strftime("%Y-%m", local_dt(column))

def year_bucket(column):
    return func.strftime("%Y", local_dt(column))

def money(x):
    return round(float(x or 0), 2)

def now_ist():
    return datetime.utcnow() + IST

def to_utc(dt_ist):
    return dt_ist - IST

def _month_start(dt):
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

def _add_months(dt, n):
    month = dt.month - 1 + n
    year = dt.year + month // 12
    month = month % 12 + 1
    return dt.replace(year=year, month=month)

def resolve_date_range(range_key: str, custom_from: datetime = None, custom_to: datetime = None):
    """today|week|month|last_month|year|last_year|custom -> (start, end) as
    UTC-naive datetimes suitable for filtering created_at columns directly."""
    now = now_ist()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if range_key == "today":
        start, end = today_start, today_start + timedelta(days=1)
    elif range_key == "week":
        start = today_start - timedelta(days=today_start.weekday())
        end = start + timedelta(days=7)
    elif range_key == "month":
        start = _month_start(today_start)
        end = _add_months(start, 1)
    elif range_key == "last_month":
        this_month_start = _month_start(today_start)
        start = _add_months(this_month_start, -1)
        end = this_month_start
    elif range_key == "year":
        start = today_start.replace(month=1, day=1)
        end = start.replace(year=start.year + 1)
    elif range_key == "last_year":
        this_year_start = today_start.replace(month=1, day=1)
        start = this_year_start.replace(year=this_year_start.year - 1)
        end = this_year_start
    elif range_key == "custom" and custom_from is not None:
        start = custom_from
        end = (custom_to + timedelta(days=1)) if custom_to else now
    else:
        # sane default: this month
        start = _month_start(today_start)
        end = _add_months(start, 1)

    return to_utc(start), to_utc(end)

def shift_range_back(start: datetime, end: datetime):
    """Equal-length immediately-preceding period, for '% vs previous period' KPIs."""
    length = end - start
    return start - length, start

RANGE_LABELS = {
    "today": "Today",
    "week": "This Week",
    "month": "This Month",
    "last_month": "Last Month",
    "year": "This Year",
    "last_year": "Last Year",
    "custom": "Custom Range",
}

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

def pct_change(current, previous):
    """Percentage change from previous -> current. None if previous is 0/None
    (division by zero would be meaningless, not "0% change")."""
    if not previous:
        return None
    return round((current - previous) / previous * 100, 1)
