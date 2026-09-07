"""PDF generation for Invoices and Bills (Phase 5). Uses reportlab (pure
Python, no external system dependencies) so this works the same on every
platform without needing wkhtmltopdf/weasyprint's system libraries.

The actual PDF-building logic lives in pdf_builder.py, shared with the
Communications module's WhatsApp document-send flow -- the PDF is built
once from one code path, never duplicated."""
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.accounting.models import Invoice
from app.accounting.pdf_builder import build_bill_pdf_bytes, build_invoice_pdf_bytes
from app.database import get_db
from app.deps import get_current_admin
from app.models import Purchase
from app.settings_helper import get_settings

router = APIRouter(tags=["accounting-pdf"])

PDF_MEDIA_TYPE = "application/pdf"


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

    pdf_bytes = build_invoice_pdf_bytes(invoice, get_settings(db))
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type=PDF_MEDIA_TYPE,
        headers={"Content-Disposition": f'inline; filename="{invoice.invoice_number}.pdf"'},
    )


@router.get("/bills/{item_id}/pdf")
def bill_pdf(item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    bill = db.query(Purchase).options(joinedload(Purchase.items)).filter(Purchase.id == item_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill_number = bill.invoice_number or f"Bill #{bill.id}"
    pdf_bytes = build_bill_pdf_bytes(bill, get_settings(db))
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type=PDF_MEDIA_TYPE,
        headers={"Content-Disposition": f'inline; filename="{bill_number}.pdf"'},
    )
