import secrets
from datetime import datetime

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdminSession, AdminUser


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> str:
    username = request.session.get("admin_username")
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if not user or not user.is_active:
        # Covers both a deleted admin and a disabled one -- previously a
        # stale signed cookie stayed silently "logged in" forever since
        # this dependency never touched the database at all.
        request.session.clear()
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(status_code=403, detail="Account temporarily locked. Try again later.")

    session_token = request.session.get("admin_session_id")
    if session_token:
        admin_session = db.query(AdminSession).filter(AdminSession.session_token == session_token).first()
        if not admin_session or admin_session.revoked_at is not None:
            request.session.clear()
            raise HTTPException(status_code=401, detail="Session has been signed out")
        admin_session.last_seen_at = datetime.utcnow()
        db.commit()
    else:
        # A cookie from before AdminSession existed -- mint a real, revocable
        # session record now instead of forcing a re-login, so it becomes
        # visible on the Sessions page starting with this request.
        session_token = secrets.token_hex(32)
        db.add(AdminSession(session_token=session_token, admin_user_id=user.id, username=username))
        db.commit()
        request.session["admin_session_id"] = session_token

    return username


def get_current_developer(request: Request, db: Session = Depends(get_db)) -> str:
    username = get_current_admin(request, db)
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if not user or user.role != "developer":
        raise HTTPException(status_code=403, detail="Developer access required")
    return username


def get_current_customer(request: Request) -> int:
    customer_id = request.session.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return customer_id
