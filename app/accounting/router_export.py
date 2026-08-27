"""Excel (.xlsx) export for the major Accounting list resources (Phase 4).
Read-only, open to any logged-in admin -- exporting isn't a mutation, so no
role gate beyond the existing admin-session check.

Every endpoint accepts optional date_from/date_to (plain dates, e.g.
2026-08-01) to export only a slice of the data instead of everything.
date_to is treated as inclusive of that whole day."""
from datetime import datetime, timedelta
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy.orm import Session, joinedload

from app.accounting.models import (
    Contact,
    Expense,
    Invoice,
    PaymentIn,
    PaymentOut,
    PurchaseOrder,
    SalesOrder,
)
from app.database import get_db
from app.deps import get_current_admin
from app.models import Purchase

router = APIRouter(prefix="/export", tags=["accounting-export"])

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _date_filter(query, column, date_from: Optional[datetime], date_to: Optional[datetime]):
    if date_from:
        query = query.filter(column >= date_from)
    if date_to:
        query = query.filter(column < date_to + timedelta(days=1))
    return query


def _xlsx_response(filename: str, headers: list[str], rows: list[list]) -> StreamingResponse:
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/sales-orders.xlsx")
def export_sales_orders(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(SalesOrder).options(joinedload(SalesOrder.contact))
    query = _date_filter(query, SalesOrder.order_date, date_from, date_to)
    rows = query.order_by(SalesOrder.order_date.desc()).all()
    data = [
        [r.order_number, r.contact.name if r.contact else "", r.order_date, r.status, r.total_amount, r.source]
        for r in rows
    ]
    return _xlsx_response(
        "sales_orders.xlsx",
        ["Order #", "Contact", "Order Date", "Status", "Total Amount", "Source"],
        data,
    )


@router.get("/invoices.xlsx")
def export_invoices(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Invoice).options(joinedload(Invoice.contact))
    query = _date_filter(query, Invoice.invoice_date, date_from, date_to)
    rows = query.order_by(Invoice.invoice_date.desc()).all()
    data = [
        [
            r.invoice_number, r.contact.name if r.contact else "", r.invoice_date, r.status,
            r.total_amount, r.amount_paid, r.balance_due, r.source,
        ]
        for r in rows
    ]
    return _xlsx_response(
        "invoices.xlsx",
        ["Invoice #", "Contact", "Invoice Date", "Status", "Total", "Paid", "Balance Due", "Source"],
        data,
    )


@router.get("/purchase-orders.xlsx")
def export_purchase_orders(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.contact))
    query = _date_filter(query, PurchaseOrder.order_date, date_from, date_to)
    rows = query.order_by(PurchaseOrder.order_date.desc()).all()
    data = [
        [r.order_number, r.contact.name if r.contact else "", r.order_date, r.status, r.total_amount]
        for r in rows
    ]
    return _xlsx_response(
        "purchase_orders.xlsx",
        ["Order #", "Supplier", "Order Date", "Status", "Total Amount"],
        data,
    )


@router.get("/bills.xlsx")
def export_bills(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Purchase)
    query = _date_filter(query, Purchase.purchase_date, date_from, date_to)
    rows = query.order_by(Purchase.purchase_date.desc()).all()
    data = [
        [r.invoice_number or f"Bill #{r.id}", r.supplier, r.purchase_date, r.status, r.total_cost]
        for r in rows
    ]
    return _xlsx_response(
        "bills.xlsx",
        ["Bill #", "Supplier", "Purchase Date", "Status", "Total Cost"],
        data,
    )


@router.get("/expenses.xlsx")
def export_expenses(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Expense)
    query = _date_filter(query, Expense.expense_date, date_from, date_to)
    rows = query.order_by(Expense.expense_date.desc()).all()
    data = [
        [r.category, r.description, r.expense_date, r.status, r.total_amount, r.amount_paid, r.balance_due]
        for r in rows
    ]
    return _xlsx_response(
        "expenses.xlsx",
        ["Category", "Description", "Expense Date", "Status", "Total", "Paid", "Balance Due"],
        data,
    )


@router.get("/contacts.xlsx")
def export_contacts(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Contact)
    query = _date_filter(query, Contact.created_at, date_from, date_to)
    rows = query.order_by(Contact.name).all()
    data = [
        [r.name, r.contact_type, r.email, r.phone, r.source, r.is_active]
        for r in rows
    ]
    return _xlsx_response(
        "contacts.xlsx",
        ["Name", "Type", "Email", "Phone", "Source", "Active"],
        data,
    )


@router.get("/payments.xlsx")
def export_payments(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    ins_q = _date_filter(
        db.query(PaymentIn).options(joinedload(PaymentIn.contact)), PaymentIn.payment_date, date_from, date_to
    )
    outs_q = _date_filter(
        db.query(PaymentOut).options(joinedload(PaymentOut.contact)), PaymentOut.payment_date, date_from, date_to
    )
    ins = ins_q.order_by(PaymentIn.payment_date.desc()).all()
    outs = outs_q.order_by(PaymentOut.payment_date.desc()).all()
    data = [
        [p.payment_date, "In", p.method, p.contact.name if p.contact else "", p.amount, p.reference]
        for p in ins
    ] + [
        [p.payment_date, "Out", p.method, p.contact.name if p.contact else "", p.amount, p.reference]
        for p in outs
    ]
    data.sort(key=lambda r: r[0], reverse=True)
    return _xlsx_response(
        "payments.xlsx",
        ["Date", "Direction", "Method", "Contact", "Amount", "Reference"],
        data,
    )
