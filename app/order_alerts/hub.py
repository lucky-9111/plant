"""Real-time new-order alert hub -- same proven pattern as
app/live_logs/hub.py (bounded ring buffer + thread-safe emit + asyncio
broadcast to WebSocket subscribers), kept as a separate, independent hub
rather than reusing the Live Logs one: that hub is Developer-only and
technical-log-flavored, while this one is business-facing and must reach
every admin/team member, not just Developers (section 8 of the New Order
Alert prompt).

The ring buffer here exists only to bridge the gap between "an order was
just created" and "a client is currently connected" -- it is NOT the
source of truth for what's still a new/unacknowledged order. That's the
Order.order_acknowledged column in the database (see router.py), which is
what a freshly-connecting client is snapshotted from first.
"""
import asyncio
import itertools
import threading
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

RING_SIZE = 500
SUBSCRIBER_QUEUE_SIZE = 200


@dataclass
class OrderAlertEvent:
    seq: int
    timestamp: str
    event_type: str  # "NEW_ORDER"
    order_id: int
    customer_name: str
    amount: float
    payment_status: str


class OrderAlertHub:
    def __init__(self, maxlen: int = RING_SIZE):
        self._buffer: deque[OrderAlertEvent] = deque(maxlen=maxlen)
        self._lock = threading.Lock()
        self._seq_counter = itertools.count(1)
        self._subscribers: set[asyncio.Queue] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def emit_new_order(self, order) -> None:
        entry = OrderAlertEvent(
            seq=next(self._seq_counter),
            timestamp=datetime.utcnow().isoformat() + "Z",
            event_type="NEW_ORDER",
            order_id=order.id,
            customer_name=order.delivery_name or (order.customer.name if order.customer else ""),
            amount=order.total_amount,
            payment_status=order.payment_status,
        )
        with self._lock:
            self._buffer.append(entry)
        if self._loop is not None:
            try:
                self._loop.call_soon_threadsafe(self._broadcast, entry)
            except RuntimeError:
                pass
        return entry

    def _broadcast(self, entry: OrderAlertEvent) -> None:
        dead = []
        for queue in self._subscribers:
            try:
                queue.put_nowait(entry)
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                    queue.put_nowait(entry)
                except Exception:
                    dead.append(queue)
        for queue in dead:
            self._subscribers.discard(queue)

    def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=SUBSCRIBER_QUEUE_SIZE)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)


hub = OrderAlertHub()
