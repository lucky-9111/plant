from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.accounting.models import Contact, Invoice
from app.accounting.schemas import AccountingOverviewOut
from app.analytics_utils import RANGE_LABELS, money, resolve_date_range
from app.database import get_db
from app.deps import get_current_admin
from app.models import Purchase, PurchaseItem

router = APIRouter(tags=["accounting-overview"])


def range_dep(
    range: str = Query("month", description="today|week|month|last_month|year|last_year|custom"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
):
    start, end = resolve_date_range(range, date_from, date_to)
    return range, start, end


@router.get("/overview", response_model=AccountingOverviewOut)
def get_overview(
    range_info: tuple = Depends(range_dep),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    range_key, start, end = range_info

    sales_row = (
        db.query(
            func.coalesce(func.sum(Invoice.total_amount), 0),
            func.coalesce(
                func.sum(case((Invoice.source == "online", Invoice.total_amount), else_=0)), 0
            ),
            func.coalesce(
                func.sum(case((Invoice.source == "offline", Invoice.total_amount), else_=0)), 0
            ),
        )
        .filter(Invoice.invoice_date >= start, Invoice.invoice_date < end, Invoice.status != "Voided")
        .first()
    )
    total_sales, online_sales, offline_sales = money(sales_row[0]), money(sales_row[1]), money(sales_row[2])

    total_purchases = money(
        db.query(func.coalesce(func.sum(PurchaseItem.total_cost), 0))
        .join(Purchase, Purchase.id == PurchaseItem.purchase_id)
        .filter(Purchase.purchase_date >= start, Purchase.purchase_date < end)
        .scalar()
    )

    # Receivables/Payables are point-in-time snapshots (all open documents to
    # date), not scoped to the selected period.
    receivables = money(
        db.query(func.coalesce(func.sum(Invoice.balance_due), 0))
        .filter(Invoice.status.notin_(["Voided", "Cancelled"]))
        .scalar()
    )
    payables = money(
        db.query(func.coalesce(func.sum(Purchase.total_cost), 0))
        .filter(Purchase.status.notin_(["Paid"]))
        .scalar()
    )

    any_purchase_ever = (db.query(func.count(Purchase.id)).scalar() or 0) > 0
    total_expenses = 0.0  # Expenses land in Phase 2 -- always 0 (real, not fabricated) until then
    net_profit = money(total_sales - total_purchases - total_expenses) if any_purchase_ever else None

    pending_invoices = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.status.in_(["Sent", "PartiallyPaid", "Overdue"]))
        .scalar()
        or 0
    )
    paid_invoices = db.query(func.count(Invoice.id)).filter(Invoice.status == "Paid").scalar() or 0
    pending_bills = (
        db.query(func.count(Purchase.id)).filter(Purchase.status.notin_(["Paid"])).scalar() or 0
    )
    new_contacts = (
        db.query(func.count(Contact.id))
        .filter(Contact.created_at >= start, Contact.created_at < end)
        .scalar()
        or 0
    )

    has_data = total_sales > 0 or total_purchases > 0

    return AccountingOverviewOut(
        range_label=RANGE_LABELS.get(range_key, range_key),
        total_sales=total_sales,
        total_purchases=total_purchases,
        receivables=receivables,
        payables=payables,
        total_expenses=total_expenses,
        net_profit=net_profit,
        online_sales=online_sales,
        offline_sales=offline_sales,
        pending_invoices=pending_invoices,
        paid_invoices=paid_invoices,
        pending_bills=pending_bills,
        new_contacts_this_period=new_contacts,
        has_data=has_data,
    )
