"""New Order Alert API -- WebSocket stream (any logged-in, active admin --
NOT developer-only, unlike Live Logs) plus the acknowledge/assign/call-status
REST endpoints live in app/routers/api_admin.py's existing Orders section
(reusing that file/router rather than duplicating admin order endpoints
here, per the master prompt's "reuse existing... do not duplicate" rule).
"""
from dataclasses import asdict
from datetime import datetime

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import AdminSession, AdminUser, Order
from app.order_alerts.hub import hub

router = APIRouter(prefix="/api/admin/order-alerts", tags=["order-alerts"])


def _websocket_is_active_admin(websocket: WebSocket) -> bool:
    """Same real checks as app.deps.get_current_admin (active, session not
    revoked) but for a WebSocket connection and without the developer-only
    restriction -- any admin/team member needs new-order alerts."""
    username = websocket.session.get("admin_username")
    if not username:
        return False
    db: Session = SessionLocal()
    try:
        user = db.query(AdminUser).filter(AdminUser.username == username).first()
        if not user or not user.is_active:
            return False
        if user.locked_until and user.locked_until > datetime.utcnow():
            return False
        session_token = websocket.session.get("admin_session_id")
        if session_token:
            admin_session = db.query(AdminSession).filter(AdminSession.session_token == session_token).first()
            if not admin_session or admin_session.revoked_at is not None:
                return False
        return True
    finally:
        db.close()


@router.websocket("/ws")
async def order_alerts_ws(websocket: WebSocket, since_seq: int = Query(0)):
    if not _websocket_is_active_admin(websocket):
        await websocket.close(code=4403)
        return

    await websocket.accept()

    # The DB is the source of truth for "what's still unacknowledged" --
    # send that first (covers "admin opens dashboard after order already
    # arrived" / "admin refreshes" edge cases), THEN stream new live events.
    db: Session = SessionLocal()
    try:
        pending = (
            db.query(Order)
            .filter(Order.order_acknowledged.is_(False))
            .order_by(Order.created_at.asc())
            .all()
        )
        for order in pending:
            await websocket.send_json({
                "seq": 0,
                "timestamp": order.created_at.isoformat() + "Z",
                "event_type": "NEW_ORDER",
                "order_id": order.id,
                "customer_name": order.delivery_name or (order.customer.name if order.customer else ""),
                "amount": order.total_amount,
                "payment_status": order.payment_status,
                "replay": True,
            })
    finally:
        db.close()

    queue = hub.subscribe()
    try:
        while True:
            entry = await queue.get()
            if entry.seq <= since_seq:
                continue  # already seen this one before a reconnect
            await websocket.send_json({**asdict(entry), "replay": False})
    except WebSocketDisconnect:
        pass
    finally:
        hub.unsubscribe(queue)
