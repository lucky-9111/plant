"""Accounting -> centralized WhatsApp, same rule as Orders/Delivery: never
call AiSensy directly, always go through app.communications.service, and
never pick a template name here -- that's resolved centrally by
WhatsAppEventTemplateMap. Covers BOTH online and offline contacts -- an
offline walk-in sale converted to an Invoice here gets exactly the same
WhatsApp treatment a website order does, which the auto-sync path
(app/accounting/sync.py) never triggers on its own.
"""
from app.communications.service import queue_event as queue_whatsapp_event


def _contact_mobile_name(contact):
    if not contact:
        return "", "Customer"
    return contact.phone, contact.name


def queue_invoice_created(invoice) -> None:
    mobile, name = _contact_mobile_name(invoice.contact)
    if not mobile:
        return
    due = invoice.due_date.strftime("%d %b %Y") if invoice.due_date else "-"
    queue_whatsapp_event(
        event_type="INVOICE_CREATED", mobile=mobile, customer_name=name,
        template_params=[name, invoice.invoice_number, f"Rs.{invoice.total_amount}", due],
        source_module="accounting", source_id=f"INV-{invoice.id}",
        customer_id=invoice.contact.customer_id if invoice.contact else None,
    )


def queue_payment_received(payment, invoice) -> None:
    mobile, name = _contact_mobile_name(invoice.contact)
    if not mobile:
        return
    queue_whatsapp_event(
        event_type="PAYMENT_RECEIVED", mobile=mobile, customer_name=name,
        template_params=[name, f"Rs.{payment.amount}", invoice.invoice_number],
        source_module="accounting", source_id=f"PAY-{payment.id}",
        customer_id=invoice.contact.customer_id if invoice.contact else None,
    )
