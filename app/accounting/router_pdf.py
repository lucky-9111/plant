"""PDF generation for Invoices and Bills (Phase 5). Uses reportlab (pure
Python, no external system dependencies) so this works the same on every
platform without needing wkhtmltopdf/weasyprint's system libraries."""
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session, joinedload

from app.accounting.models import Invoice
from app.database import get_db
from app.deps import get_current_admin
from app.models import Purchase
from app.settings_helper import get_settings

router = APIRouter(tags=["accounting-pdf"])

PDF_MEDIA_TYPE = "application/pdf"


def _business_header(settings: dict, styles) -> list:
    return [
        Paragraph(f"<b>{settings['business_name']}</b>", styles["Title"]),
        Paragraph(settings.get("address", ""), styles["Normal"]),
        Paragraph(
            f"Phone: {settings.get('phone', '')} &nbsp;&nbsp; Email: {settings.get('email', '')}",
            styles["Normal"],
        ),
        Spacer(1, 14),
    ]


def _totals_table(rows: list) -> Table:
    t = Table(rows, colWidths=[100 * mm, 40 * mm])
    t.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.black),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return t


def _items_table(header: list, rows: list) -> Table:
    t = Table([header] + rows, colWidths=[80 * mm, 25 * mm, 30 * mm, 35 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#40916c")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


@router.get("/invoices/{item_id}/pdf")
def invoice_pdf(item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.contact), joinedload(Invoice.items))
        .filter(Invoice.id == item_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    settings = get_settings(db)
    styles = getSampleStyleSheet()
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    story = _business_header(settings, styles)

    story.append(Paragraph(f"<b>INVOICE {invoice.invoice_number}</b>", styles["Heading1"]))
    story.append(
        Paragraph(
            f"Date: {invoice.invoice_date.strftime('%d %b %Y')}"
            + (f" &nbsp;&nbsp; Due: {invoice.due_date.strftime('%d %b %Y')}" if invoice.due_date else "")
            + f" &nbsp;&nbsp; Status: {invoice.status}",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 10))

    if invoice.contact:
        story.append(Paragraph("<b>Bill To</b>", styles["Heading3"]))
        story.append(Paragraph(invoice.contact.name, styles["Normal"]))
        if invoice.contact.email:
            story.append(Paragraph(invoice.contact.email, styles["Normal"]))
        if invoice.contact.phone:
            story.append(Paragraph(invoice.contact.phone, styles["Normal"]))
        story.append(Spacer(1, 14))

    item_rows = [
        [item.description, str(item.quantity), f"Rs {item.unit_price:,.2f}", f"Rs {item.line_total:,.2f}"]
        for item in invoice.items
    ]
    story.append(_items_table(["Description", "Qty", "Unit Price", "Line Total"], item_rows))
    story.append(Spacer(1, 14))

    totals_rows = [
        ["Subtotal", f"Rs {invoice.subtotal:,.2f}"],
        ["Tax", f"Rs {invoice.tax_total:,.2f}"],
    ]
    if invoice.discount_total:
        totals_rows.append(["Discount", f"Rs {invoice.discount_total:,.2f}"])
    totals_rows += [
        ["Amount Paid", f"Rs {invoice.amount_paid:,.2f}"],
        ["Balance Due", f"Rs {invoice.balance_due:,.2f}"],
        ["Total", f"Rs {invoice.total_amount:,.2f}"],
    ]
    story.append(_totals_table(totals_rows))
    story.append(Spacer(1, 20))
    story.append(Paragraph("Thank you for your business.", styles["Italic"]))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type=PDF_MEDIA_TYPE,
        headers={"Content-Disposition": f'inline; filename="{invoice.invoice_number}.pdf"'},
    )


@router.get("/bills/{item_id}/pdf")
def bill_pdf(item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    bill = db.query(Purchase).options(joinedload(Purchase.items)).filter(Purchase.id == item_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    settings = get_settings(db)
    styles = getSampleStyleSheet()
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    story = _business_header(settings, styles)

    bill_number = bill.invoice_number or f"Bill #{bill.id}"
    story.append(Paragraph(f"<b>BILL {bill_number}</b>", styles["Heading1"]))
    story.append(
        Paragraph(
            f"Date: {bill.purchase_date.strftime('%d %b %Y')}"
            + (f" &nbsp;&nbsp; Due: {bill.due_date.strftime('%d %b %Y')}" if bill.due_date else "")
            + f" &nbsp;&nbsp; Status: {bill.status}",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 10))

    if bill.supplier:
        story.append(Paragraph("<b>Supplier</b>", styles["Heading3"]))
        story.append(Paragraph(bill.supplier, styles["Normal"]))
        story.append(Spacer(1, 14))

    item_rows = [
        [item.plant_name, str(item.quantity), f"Rs {item.unit_cost:,.2f}", f"Rs {item.total_cost:,.2f}"]
        for item in bill.items
    ]
    story.append(_items_table(["Item", "Qty", "Unit Cost", "Line Total"], item_rows))
    story.append(Spacer(1, 14))

    story.append(_totals_table([["Total Cost", f"Rs {bill.total_cost:,.2f}"]]))
    story.append(Spacer(1, 20))
    if bill.notes:
        story.append(Paragraph(f"Notes: {bill.notes}", styles["Normal"]))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type=PDF_MEDIA_TYPE,
        headers={"Content-Disposition": f'inline; filename="{bill_number}.pdf"'},
    )
