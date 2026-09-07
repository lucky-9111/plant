"""Delivery -> centralized WhatsApp, same rule as Orders (app/notifications.py):
never call AiSensy directly, always go through app.communications.service.
The DELIVERY_<STATUS> event name is derived from the actual status string
(so every entry in DELIVERY_STATUSES is covered without a per-status
branch), but the TEMPLATE for that event is resolved centrally by
WhatsAppEventTemplateMap -- this module never picks a template name
itself."""
from app.communications.service import queue_driver_event, queue_event as queue_whatsapp_event


def _delivery_contact(delivery):
    mobile = (delivery.contact.phone if delivery.contact else "") or delivery.customer_mobile
    name = delivery.contact.name if delivery.contact else "Customer"
    return mobile, name


def queue_delivery_event(delivery) -> None:
    """Customer-facing delivery status update."""
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


def queue_delivery_assigned_to_driver(delivery) -> None:
    """Driver-facing: fired the moment a delivery gets a driver assigned --
    tells the driver just enough to know a new job exists, and to check the
    Delivery Dashboard for full details (section 15/39's "WhatsApp tells,
    dashboard shows everything" split). Never fails delivery assignment
    itself if the driver has no WhatsApp number/isn't active -- queue_driver_event()
    resolves and validates the driver internally."""
    if not delivery.driver_id or not delivery.driver:
        return
    customer_name = delivery.contact.name if delivery.contact else "Customer"
    address = delivery.delivery_address or (delivery.contact.address if delivery.contact else "") or "-"
    queue_driver_event(
        event_type="DELIVERY_ASSIGNED_TO_DRIVER", driver=delivery.driver,
        template_params=[
            delivery.driver.name, delivery.delivery_number or f"DEL-{delivery.id}",
            customer_name, address, delivery.delivery_date.strftime("%d %b %Y"),
        ],
        source_module="delivery", source_id=delivery.id,
    )
