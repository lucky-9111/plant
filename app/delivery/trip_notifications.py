"""Trip -> Driver WhatsApp, same centralized rule as every other module.
Deliberately its own small file (not merged into notifications.py) since
this is DRIVER-facing, not customer-facing -- keeps the two recipient
directions easy to tell apart at a glance.
"""
from app.communications.service import queue_driver_event


def queue_trip_assigned_to_driver(trip, delivery_count: int) -> None:
    """Fired once, right when a trip starts and a driver is assigned to it
    (sections 13/14 combined into one message -- "today's trip + delivery
    count" is one meaningful update, not two separate notifications)."""
    if not trip.driver:
        return
    queue_driver_event(
        event_type="TRIP_ASSIGNED_TO_DRIVER", driver=trip.driver,
        template_params=[trip.driver.name, trip.trip_number, str(delivery_count), trip.trip_date.strftime("%d %b %Y")],
        source_module="delivery", source_id=f"TRIP-{trip.id}",
    )
