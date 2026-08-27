"""Accounting module role-based permissions (Phase 4).

This is a second, independent permission axis from AdminUser.role (which
only governs Website Management / developer access) -- an admin's
accounting_role decides what they can do *inside* Accounting only.

Read (GET) endpoints stay open to any logged-in admin, same as before --
"Viewer" is exactly that: full read access, no writes. Only mutating
endpoints (POST/PUT/DELETE/void/convert) gate on role.
"""
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.models import AdminUser

ROLES = ["Owner", "Admin", "Accountant", "Sales Staff", "Purchase Staff", "Viewer"]

# Resource-group role matrices -- a set of roles allowed to WRITE to that group.
SALES_WRITE_ROLES = {"Owner", "Admin", "Accountant", "Sales Staff"}
PURCHASE_WRITE_ROLES = {"Owner", "Admin", "Accountant", "Purchase Staff"}
CONTACT_WRITE_ROLES = {"Owner", "Admin", "Accountant", "Sales Staff", "Purchase Staff"}
SETTINGS_WRITE_ROLES = {"Owner", "Admin", "Accountant"}  # Chart of Accounts, Tax Rates
EMPLOYEE_WRITE_ROLES = {"Owner", "Admin"}
ROLE_MANAGEMENT_ROLES = {"Owner"}


def get_accounting_role(
    admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
) -> str:
    user = db.query(AdminUser).filter(AdminUser.username == admin).first()
    return (user.accounting_role if user and user.accounting_role else "Viewer")


def require_roles(*allowed: str):
    allowed_set = set(allowed)

    def _dep(role: str = Depends(get_accounting_role)) -> str:
        if role not in allowed_set:
            raise HTTPException(
                status_code=403,
                detail=f"Your accounting role ({role}) does not permit this action.",
            )
        return role

    return _dep
