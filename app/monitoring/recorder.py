"""Writes error/metric/log records for the System Health dashboard.

Follows the same isolation template as app/accounting/sync.py: every public
function here opens its OWN SessionLocal() (never the caller's request
session, which may already be in a failed/rolled-back state), wraps
everything in try/except, and NEVER raises back to the caller. A bug in
monitoring code must never crash the request it's trying to protect.
"""

import hashlib
import json
import logging
import re
import traceback
from datetime import datetime, timedelta

from app.database import SessionLocal
from app.monitoring.models import ErrorLog, FunctionStats, SystemLog
from app.monitoring.redact import redact_technical_details
from app.monitoring.severity import classify

logger = logging.getLogger("app.monitoring")

SLOW_REQUEST_MS = 3000
DEFAULT_RETENTION_DAYS = 30
RETENTION_SETTING_KEY = "system_health_retention_days"
MAX_RECENT_OCCURRENCES = 20

_NUMBER_PATTERN = re.compile(r"\d+")
_SEVERITY_TO_LOG_LEVEL = {
    "CRITICAL": "CRITICAL",
    "HIGH": "ERROR",
    "MEDIUM": "WARNING",
    "WARNING": "WARNING",
    "INFO": None,  # not logged to SystemLog (WARNING+ only)
}


def _normalize_message(message: str) -> str:
    return _NUMBER_PATTERN.sub("#", message)[:500]


def _group_key(module: str, function_name: str, error_code: str, normalized_message: str) -> str:
    raw = f"{module}|{function_name}|{error_code}|{normalized_message}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def record_error(
    module: str,
    sub_module: str | None,
    function_name: str,
    endpoint: str,
    method: str,
    status_code: int,
    request_id: str | None,
    exc: BaseException | None,
    elapsed_ms: float | None = None,
    error_code: str | None = None,
    message: str | None = None,
) -> None:
    try:
        error_code = error_code or (type(exc).__name__ if exc is not None else "UNKNOWN_ERROR")
        message = (message or str(exc) or error_code) if exc is not None else (message or error_code)
        normalized = _normalize_message(message)
        key = _group_key(module, function_name, error_code, normalized)
        severity = classify(module, sub_module, function_name, endpoint, status_code, exc)

        technical_details = None
        if exc is not None:
            technical_details = redact_technical_details(
                "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
            )

        db = SessionLocal()
        try:
            now = datetime.utcnow()
            row = db.query(ErrorLog).filter(ErrorLog.group_key == key).first()
            if row:
                row.occurrence_count += 1
                row.last_seen = now
                row.last_request_id = request_id
                if row.status == "RESOLVED":
                    row.status = "ACTIVE"  # a "fixed" error recurring is itself signal
                try:
                    recent = json.loads(row.recent_occurrences_json) if row.recent_occurrences_json else []
                except (ValueError, TypeError):
                    recent = []
                recent.append({"request_id": request_id, "at": now.isoformat()})
                row.recent_occurrences_json = json.dumps(recent[-MAX_RECENT_OCCURRENCES:])
                if technical_details:
                    row.technical_details = technical_details
            else:
                row = ErrorLog(
                    group_key=key,
                    module=module,
                    sub_module=sub_module,
                    function_name=function_name,
                    endpoint=endpoint,
                    method=method,
                    error_code=error_code,
                    message=message[:500],
                    severity=severity,
                    status="ACTIVE",
                    first_seen=now,
                    last_seen=now,
                    occurrence_count=1,
                    last_request_id=request_id,
                    technical_details=technical_details,
                    request_metadata=json.dumps({"method": method, "endpoint": endpoint}),
                    recent_occurrences_json=json.dumps([{"request_id": request_id, "at": now.isoformat()}]),
                )
                db.add(row)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("failed to persist ErrorLog for request_id=%s", request_id)
        finally:
            db.close()

        _write_system_log(
            severity, message, request_id, module, function_name, endpoint, method, status_code, elapsed_ms, error_code
        )
    except Exception:
        logger.exception("record_error itself failed for request_id=%s (request is unaffected)", request_id)


def record_request_outcome(
    module: str,
    sub_module: str | None,
    function_name: str,
    endpoint: str,
    method: str,
    status_code: int,
    request_id: str,
    elapsed_ms: float,
) -> None:
    try:
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            row = (
                db.query(FunctionStats)
                .filter(
                    FunctionStats.module == module,
                    FunctionStats.function_name == function_name,
                    FunctionStats.endpoint == endpoint,
                    FunctionStats.method == method,
                )
                .first()
            )
            if not row:
                # SQLAlchemy Column(default=...) is only applied at flush/insert
                # time, not on the Python object -- set these explicitly so the
                # `+=` below (which runs before this row is ever flushed) has
                # ints to work with instead of None.
                row = FunctionStats(
                    module=module,
                    sub_module=sub_module,
                    function_name=function_name,
                    endpoint=endpoint,
                    method=method,
                    success_count=0,
                    failure_count=0,
                    total_duration_ms=0.0,
                    slow_count=0,
                )
                db.add(row)

            if status_code >= 500:
                row.failure_count += 1
                row.last_failure_at = now
            else:
                row.success_count += 1
                row.last_success_at = now
            row.total_duration_ms += elapsed_ms
            if elapsed_ms > SLOW_REQUEST_MS:
                row.slow_count += 1
            row.updated_at = now
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("failed to persist FunctionStats for request_id=%s", request_id)
        finally:
            db.close()

        if status_code >= 400:
            level = "ERROR" if status_code >= 500 else "WARNING"
            record_system_log(
                level, f"{method} {endpoint} -> {status_code}", request_id, module, function_name, endpoint, method, status_code, elapsed_ms
            )
    except Exception:
        logger.exception("record_request_outcome itself failed for request_id=%s (request is unaffected)", request_id)


def _write_system_log(severity, message, request_id, module, function_name, endpoint, method, status_code, elapsed_ms, error_code):
    level = _SEVERITY_TO_LOG_LEVEL.get(severity)
    if level is None:
        return
    record_system_log(level, message, request_id, module, function_name, endpoint, method, status_code, elapsed_ms, error_code)


def record_system_log(
    level: str,
    message: str,
    request_id: str | None = None,
    module: str | None = None,
    function_name: str | None = None,
    endpoint: str | None = None,
    method: str | None = None,
    status_code: int | None = None,
    execution_ms: float | None = None,
    error_code: str | None = None,
) -> None:
    try:
        db = SessionLocal()
        try:
            db.add(
                SystemLog(
                    level=level,
                    request_id=request_id,
                    module=module,
                    function_name=function_name,
                    endpoint=endpoint,
                    method=method,
                    status_code=status_code,
                    execution_ms=execution_ms,
                    error_code=error_code,
                    message=message[:500],
                )
            )
            _purge_expired_logs(db)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("failed to persist SystemLog")
        finally:
            db.close()
    except Exception:
        logger.exception("record_system_log itself failed (request is unaffected)")


def _purge_expired_logs(db) -> None:
    # Local import: app.models is a large module and SiteSetting is only
    # needed here, so this avoids a broader import-time coupling.
    from app.models import SiteSetting

    retention_days = DEFAULT_RETENTION_DAYS
    setting = db.query(SiteSetting).filter(SiteSetting.key == RETENTION_SETTING_KEY).first()
    if setting and setting.value:
        try:
            retention_days = max(1, int(setting.value))
        except ValueError:
            pass
    cutoff = datetime.utcnow() - timedelta(days=retention_days)
    db.query(SystemLog).filter(SystemLog.created_at < cutoff).delete(synchronize_session=False)
