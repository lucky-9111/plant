"""Live Logs API -- WebSocket stream + a small HTTP surface for the job
list. Developer-only everywhere (master prompt section 22): Admin and
Super Access users get no automatic access, matching how the rest of the
Developer Dashboard already gates on `AdminUser.role == "developer"`.
"""
from dataclasses import asdict
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.deps import get_current_developer
from app.live_logs.hub import hub
from app.models import AdminSession, AdminUser

router = APIRouter(prefix="/api/developer/live-logs", tags=["live-logs"])


def _websocket_is_developer(websocket: WebSocket) -> bool:
    """Mirrors app.deps.get_current_developer's real checks (active,
    developer role, session not revoked) but reads from `websocket.session`
    instead of `request.session` -- WebSocket connections don't go through
    the normal HTTP dependency-injection path FastAPI uses for Depends()."""
    username = websocket.session.get("admin_username")
    if not username:
        return False

    db: Session = SessionLocal()
    try:
        user = db.query(AdminUser).filter(AdminUser.username == username).first()
        if not user or not user.is_active or user.role != "developer":
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
async def live_logs_ws(
    websocket: WebSocket,
    since: int = Query(0, description="Replay entries with seq > since (reconnect without duplicates)"),
    job_id: Optional[str] = Query(None),
):
    if not _websocket_is_developer(websocket):
        await websocket.close(code=4403)
        return

    await websocket.accept()
    queue = hub.subscribe()
    try:
        for entry in hub.snapshot(since_seq=since, job_id=job_id, limit=500):
            await websocket.send_json(asdict(entry))

        while True:
            entry = await queue.get()
            if job_id and entry.job_id != job_id:
                continue
            await websocket.send_json(asdict(entry))
    except WebSocketDisconnect:
        pass
    finally:
        hub.unsubscribe(queue)


@router.get("/jobs")
def list_jobs(developer: str = Depends(get_current_developer)):
    return hub.known_jobs()
