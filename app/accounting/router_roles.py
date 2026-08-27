from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.accounting.permissions import ROLE_MANAGEMENT_ROLES, ROLES, require_roles
from app.accounting.schemas import AdminAccountingRoleIn, AdminAccountingRoleOut
from app.database import get_db
from app.deps import get_current_admin
from app.models import AdminUser

router = APIRouter(prefix="/roles", tags=["accounting-roles"])


@router.get("", response_model=list[AdminAccountingRoleOut])
def list_roles(
    admin: str = Depends(get_current_admin),
    _role: str = Depends(require_roles(*ROLE_MANAGEMENT_ROLES)),
    db: Session = Depends(get_db),
):
    return db.query(AdminUser).order_by(AdminUser.username).all()


@router.put("/{admin_user_id}", response_model=AdminAccountingRoleOut)
def set_role(
    admin_user_id: int,
    payload: AdminAccountingRoleIn,
    admin: str = Depends(get_current_admin),
    _role: str = Depends(require_roles(*ROLE_MANAGEMENT_ROLES)),
    db: Session = Depends(get_db),
):
    if payload.accounting_role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(ROLES)}")
    user = db.query(AdminUser).filter(AdminUser.id == admin_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Admin user not found")
    if user.username == admin and payload.accounting_role != "Owner":
        raise HTTPException(status_code=400, detail="You cannot demote your own Owner role.")
    user.accounting_role = payload.accounting_role
    db.commit()
    db.refresh(user)
    return user
