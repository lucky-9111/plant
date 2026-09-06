"""Stock Chart (Phase A) -- a market-terminal-style view of REAL sales data.

Deliberately its own router/page, not merged into api_admin_analytics.py --
the existing Analytics page and every one of its endpoints are completely
untouched by this file.

Data source: app.accounting.models.SalesOrder, the accounting module's
already-existing unified sales ledger -- source='online' rows are 1:1
mirrors of every website Order (synced automatically at checkout);
source='offline' rows are manually entered walk-in/phone sales. This is
the real single source of truth for "total business sales", reused as-is
rather than inventing a second one.

OHLCV per bucket is computed from real per-order "ticks" (never fabricated):
  OPEN  = first order's value in the bucket (chronologically)
  HIGH  = largest order value in the bucket
  LOW   = smallest order value in the bucket
  CLOSE = last order's value in the bucket (chronologically)
  VOLUME = order count or unit count, per the volume_type param
When `instrument` narrows to a category/product, each order's "value" is
just the sum of that order's matching line items, not the whole order.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.accounting.models import SalesOrder
from app.analytics_utils import money, now_ist
from app.database import get_db
from app.deps import get_current_admin
from app.models import Category, Plant
from app.schemas import StockChartFiltersOut, StockChartOut, StockChartPointOut

router = APIRouter(prefix="/api/admin/stock-chart")

TIMEFRAME_DAYS = {"1D": 1, "5D": 5, "1W": 7, "1M": 30, "3M": 90, "6M": 182, "1Y": 365, "3Y": 365 * 3}
VALID_INSTRUMENTS = {"total", "online", "offline", "category", "product"}
VALID_VOLUME_TYPES = {"orders", "units"}


def _resolve_range(timeframe: str, date_from: Optional[datetime], date_to: Optional[datetime]):
    now = now_ist()
    if timeframe == "CUSTOM":
        if not date_from or not date_to:
            raise HTTPException(status_code=400, detail="date_from and date_to are required for CUSTOM")
        return date_from, date_to
    if timeframe == "ALL":
        return None, now
    days = TIMEFRAME_DAYS.get(timeframe)
    if days is None:
        raise HTTPException(status_code=400, detail=f"Unknown timeframe. Use one of: {', '.join(TIMEFRAME_DAYS)}, ALL, CUSTOM")
    return now - timedelta(days=days), now


def _auto_interval(timeframe: str) -> str:
    if timeframe == "1D":
        return "raw"
    if timeframe in ("5D", "1W", "1M", "3M"):
        return "daily"
    if timeframe in ("6M", "1Y"):
        return "weekly"
    return "monthly"  # 3Y, ALL, CUSTOM (large spans)


def _bucket_key(dt: datetime, interval: str) -> str:
    if interval == "raw":
        return dt.isoformat()
    if interval == "weekly":
        start = dt - timedelta(days=dt.weekday())
        return start.strftime("%Y-%m-%d")
    if interval == "monthly":
        return dt.strftime("%Y-%m-01")
    return dt.strftime("%Y-%m-%d")  # daily


@router.get("/filters", response_model=StockChartFiltersOut)
def get_stock_chart_filters(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.display_order).all()
    plants = db.query(Plant).filter(Plant.is_active.is_(True)).order_by(Plant.name).all()
    return StockChartFiltersOut(
        categories=[{"id": c.id, "name": c.name} for c in categories],
        plants=[{"id": p.id, "name": p.name, "category_id": p.category_id} for p in plants],
    )


@router.get("", response_model=StockChartOut)
def get_stock_chart(
    instrument: str = Query("total"),
    category_id: Optional[int] = Query(None),
    plant_id: Optional[int] = Query(None),
    timeframe: str = Query("1M"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    interval: Optional[str] = Query(None, description="raw|daily|weekly|monthly -- auto-selected from timeframe if omitted"),
    volume_type: str = Query("orders"),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if instrument not in VALID_INSTRUMENTS:
        raise HTTPException(status_code=400, detail=f"instrument must be one of: {', '.join(VALID_INSTRUMENTS)}")
    if volume_type not in VALID_VOLUME_TYPES:
        raise HTTPException(status_code=400, detail=f"volume_type must be one of: {', '.join(VALID_VOLUME_TYPES)}")

    start, end = _resolve_range(timeframe, date_from, date_to)
    resolved_interval = interval or _auto_interval(timeframe)

    # Real completed sales only -- Draft is an unfinalized record (not yet a
    # real transaction), Cancelled/Voided are explicitly dead. Confirmed and
    # Invoiced are the only genuinely-happened-sale states. This was
    # previously an exclude-list that only filtered out Voided, which let
    # Draft rows (large, unfinalized, easy to create by accident) distort
    # the chart's scale -- confirmed directly against the real data: the
    # single largest outlier turned out to be a Draft record.
    query = (
        db.query(SalesOrder)
        .options(joinedload(SalesOrder.items))
        .filter(SalesOrder.status.in_(["Confirmed", "Invoiced"]))
        .filter(SalesOrder.order_date <= end)
    )
    if start:
        query = query.filter(SalesOrder.order_date >= start)
    if instrument == "online":
        query = query.filter(SalesOrder.source == "online")
    elif instrument == "offline":
        query = query.filter(SalesOrder.source == "offline")

    orders = query.order_by(SalesOrder.order_date.asc()).all()

    # One "tick" per order: (timestamp, value, units, order_id). For
    # category/product instruments, value/units are just that order's
    # matching line items -- an order with no matching lines contributes
    # nothing (never a fabricated zero-value tick).
    ticks = []
    for o in orders:
        if instrument == "product" and plant_id:
            items = [it for it in o.items if it.plant_id == plant_id]
            if not items:
                continue
            value = sum(it.line_total for it in items)
            units = sum(it.quantity for it in items)
        elif instrument == "category" and category_id:
            items = [it for it in o.items if it.plant_id and it.plant and it.plant.category_id == category_id]
            if not items:
                continue
            value = sum(it.line_total for it in items)
            units = sum(it.quantity for it in items)
        else:
            value = o.total_amount
            units = sum(it.quantity for it in o.items)
        ticks.append((o.order_date, value, units, o.id))

    buckets: dict[str, dict] = {}
    for dt, value, units, order_id in ticks:
        key = _bucket_key(dt, resolved_interval)
        b = buckets.setdefault(key, {"values": [], "units": 0, "orders": set()})
        b["values"].append(value)
        b["units"] += units
        b["orders"].add(order_id)

    points = []
    for key in sorted(buckets.keys()):
        b = buckets[key]
        vol = len(b["orders"]) if volume_type == "orders" else b["units"]
        points.append(
            StockChartPointOut(
                timestamp=key,
                open=money(b["values"][0]),
                high=money(max(b["values"])),
                low=money(min(b["values"])),
                close=money(b["values"][-1]),
                volume=vol,
            )
        )

    total_sales = money(sum(v for _, v, _, _ in ticks))
    today_key = _bucket_key(now_ist(), "daily")
    today_sales = money(sum(v for dt, v, _, _ in ticks if _bucket_key(dt, "daily") == today_key))
    orders_count = len({oid for _, _, _, oid in ticks})
    units_count = sum(u for _, _, u, _ in ticks)
    average_order_value = money(total_sales / orders_count) if orders_count else 0.0

    change_amount = 0.0
    change_pct = 0.0
    if len(points) >= 2 and points[-2].close:
        change_amount = money(points[-1].close - points[-2].close)
        change_pct = round((change_amount / points[-2].close) * 100, 2)

    return StockChartOut(
        interval=resolved_interval,
        points=points,
        has_data=len(points) > 0,
        total_sales=total_sales,
        today_sales=today_sales,
        change_amount=change_amount,
        change_pct=change_pct,
        orders_count=orders_count,
        units_count=units_count,
        average_order_value=average_order_value,
    )
