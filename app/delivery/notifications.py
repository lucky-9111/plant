"""Delivery -> centralized WhatsApp, same rule as Orders (app/notifications.py):
never call AiSensy directly, always go through app.communications.service.
The DELIVERY_<STATUS> event name is derived from the actual status string
(so every entry in DELIVERY_STATUSES is covered without a per-status
branch), but the TEMPLATE for that event is resolved centrally by
WhatsAppEventTemplateMap -- this module never picks a template name
itself."""
from app.communications.service import queue_event as queue_whatsapp_event


def _delivery_contact(delivery):
    mobile = (delivery.contact.phone if delivery.contact else "") or delivery.customer_mobile
    name = delivery.contact.name if delivery.contact else "Customer"
    return mobile, name


def queue_delivery_event(delivery) -> None:
    mobile, name = _delivery_contact(delivery)
    if not mobile:
        return
    event_type = f"DELIVERY_{delivery.status.upper().replace(' ', '_')}"
    driver_name = delivery.driver.name if delivery.driver_id and delivery.driver else ""
    params = [name, delivery.delivery_number or f"DEL-{delivery.id}"]
    if driver_name:
        params.append(driver_name)
    queue_whatsapp_event(
        event_type=event_type, mobile=mobile, customer_name=name,
        template_params=params,
        source_module="delivery", source_id=delivery.id, customer_id=delivery.contact.customer_id if delivery.contact else None,
    )
