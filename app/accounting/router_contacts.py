from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.accounting.audit import record_change
from app.accounting.models import Contact, Invoice, PaymentIn
from app.accounting.schemas import ContactIn, ContactOut
from app.database import get_db
from app.deps import get_current_admin

router = APIRouter(prefix="/contacts", tags=["accounting-contacts"])


def _get_or_404(db: Session, item_id: int) -> Contact:
    item = db.query(Contact).filter(Contact.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Contact not found")
    return item


def _with_summary(db: Session, contact: Contact) -> ContactOut:
    total_sales = (
        db.query(func.coalesce(func.sum(Invoice.total_amount), 0))
        .filter(Invoice.contact_id == contact.id, Invoice.status != "Voided")
        .scalar()
        or 0
    )
    total_paid = (
        db.query(func.coalesce(func.sum(PaymentIn.amount), 0))
        .filter(PaymentIn.contact_id == contact.id)
        .scalar()
        or 0
    )
    out = ContactOut.model_validate(contact)
    out.total_sales = round(total_sales, 2)
    out.total_paid = round(total_paid, 2)
    out.outstanding = round(total_sales - total_paid, 2)
    return out


@router.get("", response_model=list[ContactOut])
def list_contacts(
    source: Optional[str] = Query(None, description="online|offline"),
    contact_type: Optional[str] = Query(None, description="customer|supplier|both"),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Contact)
    if source in ("online", "offline"):
        query = query.filter(Contact.source == source)
    if contact_type:
        query = query.filter(Contact.contact_type == contact_type)
    contacts = query.order_by(Contact.name).all()
    return [_with_summary(db, c) for c in contacts]


@router.get("/{item_id}", response_model=ContactOut)
def get_contact(
    item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    return _with_summary(db, _get_or_404(db, item_id))


@router.post("", response_model=ContactOut, status_code=201)
def create_contact(
    payload: ContactIn, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = Contact(**payload.model_dump(), source="offline")
    db.add(item)
    db.commit()
    db.refresh(item)
    record_change(db, "accounting_contacts", item.id, "create", changed_by=admin)
    db.commit()
    return _with_summary(db, item)


@router.put("/{item_id}", response_model=ContactOut)
def update_contact(
    item_id: int,
    payload: ContactIn,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    item = _get_or_404(db, item_id)
    if item.source == "online":
        raise HTTPException(
            status_code=400,
            detail="This contact is linked to a real website customer and can't be edited here.",
        )
    changes = {}
    for field, value in payload.model_dump().items():
        old = getattr(item, field)
        if old != value:
            changes[field] = (old, value)
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    if changes:
        record_change(db, "accounting_contacts", item.id, "update", changed_by=admin, changes=changes)
        db.commit()
    return _with_summary(db, item)


@router.delete("/{item_id}", status_code=204)
def delete_contact(
    item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = _get_or_404(db, item_id)
    if item.source == "online":
        raise HTTPException(
            status_code=400,
            detail="This contact is linked to a real website customer and can't be deleted.",
        )
    has_docs = (
        db.query(Invoice).filter(Invoice.contact_id == item.id).first()
        or db.query(PaymentIn).filter(PaymentIn.contact_id == item.id).first()
    )
    if has_docs:
        raise HTTPException(
            status_code=400, detail="Cannot delete a contact with existing invoices or payments."
        )
    db.delete(item)
    db.commit()
