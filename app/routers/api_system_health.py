"""Admin-only System Health API: Overview, Active Errors, Error History,
Function Monitoring, System Logs. Every endpoint is gated by
`Depends(get_current_developer)` -- the same dependency already used for
the existing Developer-only `activity-log`/`system-info` endpoints -- so
this is enforced on the backend, not just hidden behind a frontend nav item.
"""

import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_developer
from app.models import SiteSetting
from app.monitoring.models import ErrorLog, FunctionStats, SystemLog
from app.monitoring.recorder import DEFAULT_RETENTION_DAYS, RETENTION_SETTING_KEY
from app.routers.api_admin import log_activity

router = APIRouter(prefix="/api/admin/system-health", tags=["system-health"])

# (display label, module keys that roll up into this tile). "External APIs"
# is populated by app/payments.py and app/notifications.py calling
# record_error(module="External APIs", sub_module="Razorpay"/"SMTP"/...)
# directly at their existing except blocks, so it's a real, independently
# monitored tile rather than inferred from URL path like the others.
OVERVIEW_TILES = [
    ("Website", ["Website"]),
    ("Authentication", ["Auth"]),
    ("Products", ["Products"]),
    ("Search", ["Search"]),
    ("Cart", ["Cart"]),
    ("Orders & Payments", ["Checkout"]),
    ("Accounting", ["Accounting"]),
    ("Labour", ["Labour"]),
    ("Delivery", ["Delivery"]),
    ("Analytics", ["Analytics"]),
    ("External APIs", ["External APIs"]),
]

STATUS_EMOJI = {"healthy": "🟢", "warning": "🟡", "degraded": "🟠", "critical": "🔴", "unknown": "⚪"}
STATUS_LABEL = {"healthy": "Healthy", "warning": "Warning", "degraded": "Degraded", "critical": "Critical", "unknown": "Unknown"}


def _tile_status(db: Session, module_keys: list[str]) -> str:
    rows = (
        db.query(ErrorLog.severity)
        .filter(ErrorLog.module.in_(module_keys), ErrorLog.status.in_(["ACTIVE", "INVESTIGATING"]))
        .all()
    )
    severities = {s for (s,) in rows}
    if "CRITICAL" in severities:
        return "critical"
    if "HIGH" in severities:
        return "degraded"
    if severities:
        return "warning"
    return "healthy"


def _tile(label: str, status: str) -> dict:
    return {"module": label, "status": status, "emoji": STATUS_EMOJI[status], "label_text": STATUS_LABEL[status]}


@router.get("/overview")
def get_overview(admin: str = Depends(get_current_developer), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    tiles = [_tile(label, _tile_status(db, keys)) for label, keys in OVERVIEW_TILES]

    try:
        db.execute(text("SELECT 1"))
        tiles.append(_tile("Database", "healthy"))
    except Exception:
        tiles.append(_tile("Database", "critical"))

    errors_today = db.query(ErrorLog).filter(ErrorLog.last_seen >= today_start).count()
    errors_24h = db.query(ErrorLog).filter(ErrorLog.last_seen >= now - timedelta(hours=24)).count()
    errors_7d = db.query(ErrorLog).filter(ErrorLog.last_seen >= now - timedelta(days=7)).count()
    critical_active = (
        db.query(ErrorLog).filter(ErrorLog.status.in_(["ACTIVE", "INVESTIGATING"]), ErrorLog.severity == "CRITICAL").count()
    )
    active = db.query(ErrorLog).filter(ErrorLog.status.in_(["ACTIVE", "INVESTIGATING"])).count()
    resolved = db.query(ErrorLog).filter(ErrorLog.status == "RESOLVED").count()

    top_failing = (
        db.query(FunctionStats)
        .filter(FunctionStats.failure_count > 0)
        .order_by(FunctionStats.failure_count.desc())
        .limit(5)
        .all()
    )

    return {
        "modules": tiles,
        "stats": {
            "errors_today": errors_today,
            "errors_24h": errors_24h,
            "errors_7d": errors_7d,
            "critical_active": critical_active,
            "active": active,
            "resolved": resolved,
        },
        "top_failing_functions": [
            {
                "module": f.module,
                "sub_module": f.sub_module,
                "function": f.function_name,
                "endpoint": f.endpoint,
                "failure_count": f.failure_count,
            }
            for f in top_failing
        ],
    }


def _serialize_error(row: ErrorLog, include_technical: bool = False) -> dict:
    data = {
        "id": row.id,
        "module": row.module,
        "sub_module": row.sub_module,
        "function": row.function_name,
        "endpoint": row.endpoint,
        "method": row.method,
        "error_code": row.error_code,
        "message": row.message,
        "severity": row.severity,
        "status": row.status,
        "first_seen": row.first_seen.isoformat() if row.first_seen else None,
        "last_seen": row.last_seen.isoformat() if row.last_seen else None,
        "occurrence_count": row.occurrence_count,
        "last_request_id": row.last_request_id,
        "resolved_by": row.resolved_by,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
        "resolution_note": row.resolution_note,
    }
    if include_technical:
        try:
            data["recent_occurrences"] = json.loads(row.recent_occurrences_json) if row.recent_occurrences_json else []
        except (ValueError, TypeError):
            data["recent_occurrences"] = []
        data["technical_details"] = row.technical_details
        try:
            data["request_metadata"] = json.loads(row.request_metadata) if row.request_metadata else {}
        except (ValueError, TypeError):
            data["request_metadata"] = {}
    return data


@router.get("/errors/active")
def list_active_errors(
    module: str | None = None,
    severity: str | None = None,
    admin: str = Depends(get_current_developer),
    db: Session = Depends(get_db),
):
    query = db.query(ErrorLog).filter(ErrorLog.status.in_(["ACTIVE", "INVESTIGATING"]))
    if module:
        query = query.filter(ErrorLog.module == module)
    if severity:
        query = query.filter(ErrorLog.severity == severity)
    rows = query.order_by(ErrorLog.last_seen.desc()).limit(200).all()
    return [_serialize_error(r) for r in rows]


@router.get("/errors/history")
def list_error_history(
    response: Response,
    date_from: str | None = None,
    date_to: str | None = None,
    module: str | None = None,
    function: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    admin: str = Depends(get_current_developer),
    db: Session = Depends(get_db),
):
    query = db.query(ErrorLog)
    if date_from:
        query = query.filter(ErrorLog.last_seen >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(ErrorLog.first_seen <= datetime.fromisoformat(date_to))
    if module:
        query = query.filter(ErrorLog.module == module)
    if function:
        query = query.filter(ErrorLog.function_name.ilike(f"%{function}%"))
    if severity:
        query = query.filter(ErrorLog.severity == severity)
    if status:
        query = query.filter(ErrorLog.status == status)
    if q:
        query = query.filter(ErrorLog.message.ilike(f"%{q}%"))

    total = query.count()
    rows = query.order_by(ErrorLog.last_seen.desc()).offset((page - 1) * limit).limit(limit).all()

    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Total-Pages"] = str(max(1, -(-total // limit)))

    return [_serialize_error(r) for r in rows]


@router.get("/errors/{error_id}")
def get_error_detail(error_id: int, admin: str = Depends(get_current_developer), db: Session = Depends(get_db)):
    row = db.query(ErrorLog).filter(ErrorLog.id == error_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Error record not found")
    return _serialize_error(row, include_technical=True)


class ErrorStatusIn(BaseModel):
    status: str
    note: str | None = None


ERROR_STATUSES = {"ACTIVE", "INVESTIGATING", "RESOLVED", "IGNORED"}


@router.post("/errors/{error_id}/status")
def update_error_status(
    error_id: int,
    payload: ErrorStatusIn,
    admin: str = Depends(get_current_developer),
    db: Session = Depends(get_db),
):
    if payload.status not in ERROR_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {sorted(ERROR_STATUSES)}")
    row = db.query(ErrorLog).filter(ErrorLog.id == error_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Error record not found")

    row.status = payload.status
    row.resolution_note = payload.note
    if payload.status == "RESOLVED":
        row.resolved_by = admin
        row.resolved_at = datetime.utcnow()
    else:
        row.resolved_by = None
        row.resolved_at = None
    db.commit()

    log_activity(db, admin, "error_status_changed", f"error #{error_id} -> {payload.status}")
    return _serialize_error(row)


@router.get("/functions")
def list_function_stats(module: str | None = None, admin: str = Depends(get_current_developer), db: Session = Depends(get_db)):
    query = db.query(FunctionStats)
    if module:
        query = query.filter(FunctionStats.module == module)
    rows = query.order_by(FunctionStats.failure_count.desc()).all()

    result = []
    for f in rows:
        total = f.success_count + f.failure_count
        result.append(
            {
                "module": f.module,
                "sub_module": f.sub_module,
                "function": f.function_name,
                "endpoint": f.endpoint,
                "method": f.method,
                "success_count": f.success_count,
                "failure_count": f.failure_count,
                "failure_rate": round(f.failure_count / total, 4) if total else 0.0,
                "avg_response_ms": round(f.total_duration_ms / total, 1) if total else None,
                "slow_count": f.slow_count,
                "last_success_at": f.last_success_at.isoformat() if f.last_success_at else None,
                "last_failure_at": f.last_failure_at.isoformat() if f.last_failure_at else None,
            }
        )
    return result


@router.get("/logs")
def list_system_logs(
    response: Response,
    level: str | None = None,
    module: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    admin: str = Depends(get_current_developer),
    db: Session = Depends(get_db),
):
    query = db.query(SystemLog)
    if level:
        query = query.filter(SystemLog.level == level)
    if module:
        query = query.filter(SystemLog.module == module)
    if date_from:
        query = query.filter(SystemLog.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(SystemLog.created_at <= datetime.fromisoformat(date_to))

    total = query.count()
    rows = query.order_by(SystemLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Total-Pages"] = str(max(1, -(-total // limit)))

    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "level": r.level,
            "request_id": r.request_id,
            "module": r.module,
            "function": r.function_name,
            "endpoint": r.endpoint,
            "method": r.method,
            "status_code": r.status_code,
            "execution_ms": r.execution_ms,
            "error_code": r.error_code,
            "message": r.message,
        }
        for r in rows
    ]


@router.get("/settings")
def get_settings(admin: str = Depends(get_current_developer), db: Session = Depends(get_db)):
    setting = db.query(SiteSetting).filter(SiteSetting.key == RETENTION_SETTING_KEY).first()
    days = DEFAULT_RETENTION_DAYS
    if setting and setting.value:
        try:
            days = int(setting.value)
        except ValueError:
            pass
    return {
        "retention_days": days,
        "note": "System Logs are pruned after this many days. Error records (Active Errors / Error History) are never auto-deleted. "
        "This app runs on Render's free tier with no persistent disk, so all of this data (like the rest of the database) "
        "resets on every restart/redeploy -- retention only matters within the current running instance's uptime.",
    }


class RetentionSettingIn(BaseModel):
    retention_days: int


@router.put("/settings")
def update_settings(payload: RetentionSettingIn, admin: str = Depends(get_current_developer), db: Session = Depends(get_db)):
    if payload.retention_days < 1 or payload.retention_days > 365:
        raise HTTPException(status_code=400, detail="Retention days must be between 1 and 365")
    setting = db.query(SiteSetting).filter(SiteSetting.key == RETENTION_SETTING_KEY).first()
    if not setting:
        setting = SiteSetting(key=RETENTION_SETTING_KEY, value=str(payload.retention_days))
        db.add(setting)
    else:
        setting.value = str(payload.retention_days)
    db.commit()
    log_activity(db, admin, "system_health_retention_changed", str(payload.retention_days))
    return get_settings(admin=admin, db=db)


@router.post("/external-check/{service}")
def external_check(service: str, admin: str = Depends(get_current_developer), db: Session = Depends(get_db)):
    """Reports the currently-known status for an external service based on
    recently recorded errors, rather than making a live outbound call --
    triggering a real request to a payment gateway from an admin dashboard
    button is a separate, riskier feature (cost/rate-limit/hang implications)
    that this pass deliberately does not implement."""
    service_key = service.strip().title()
    status = _tile_status(db, ["External APIs"])
    recent = (
        db.query(ErrorLog)
        .filter(ErrorLog.module == "External APIs", ErrorLog.sub_module == service_key)
        .order_by(ErrorLog.last_seen.desc())
        .first()
    )
    return {
        "service": service_key,
        "status": status,
        "last_known_error": _serialize_error(recent) if recent else None,
        "note": "Based on recently logged failures for this service, not a live outbound check.",
    }
