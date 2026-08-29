from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.accounting.models import AuditLog
from app.accounting.schemas import AuditLogOut
from app.database import get_db
from app.deps import get_current_admin

router = APIRouter(prefix="/audit-log", tags=["accounting-audit"])


@router.get("", response_model=list[AuditLogOut])
def get_audit_log(
    table_name: str = Query(...),
    record_id: int = Query(...),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(AuditLog)
        .filter(AuditLog.table_name == table_name, AuditLog.record_id == record_id)
        .order_by(AuditLog.changed_at.desc())
        .all()
    )
