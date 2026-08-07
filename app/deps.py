from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdminUser


def get_current_admin(request: Request) -> str:
    username = request.session.get("admin_username")
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return username


def get_current_developer(request: Request, db: Session = Depends(get_db)) -> str:
    username = get_current_admin(request)
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if not user or user.role != "developer":
        raise HTTPException(status_code=403, detail="Developer access required")
    return username


def get_current_customer(request: Request) -> int:
    customer_id = request.session.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return customer_id
