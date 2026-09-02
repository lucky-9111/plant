"""Fault-isolated audit logging for the Developer Dashboard RBAC feature.

Writes into the existing `admin_activity_log` table (already Developer-only,
already surfaced at GET /api/admin/activity-log and ActivityLog.jsx) rather
than a new table -- this just adds new `action` tag conventions on top of
the ones api_admin.py's existing log_activity() already writes (login,
admin_created, role_changed, password_reset, admin_deleted, ...).

Follows the exact isolation template as app/monitoring/recorder.py: opens
its OWN SessionLocal() (never the caller's possibly-already-failed request
session), wraps everything in try/except, and NEVER raises back to the
caller. A bug in audit logging must never break the request it's auditing.
"""

import json
import logging

from app.database import SessionLocal
from app.models import AdminActivityLog

logger = logging.getLogger("app.audit")

# New action tags used by the Developer Dashboard RBAC feature. Existing tags
# (login, admin_created, role_changed, password_reset, admin_deleted, etc.)
# keep being written directly via api_admin.py's log_activity() helper.
ROLE_CREATED = "role_created"
ROLE_UPDATED = "role_updated"
ROLE_PERMISSION_CHANGED = "role_permission_changed"
ROLE_DELETED = "role_deleted"
PERMISSION_OVERRIDE_GRANTED = "permission_override_granted"
PERMISSION_OVERRIDE_REVOKED = "permission_override_revoked"
SUPER_ACCESS_GRANTED = "super_access_granted"
SUPER_ACCESS_REVOKED = "super_access_revoked"
ADMIN_DISABLED = "admin_disabled"
ADMIN_ENABLED = "admin_enabled"
SESSION_REVOKED = "session_revoked"
ALL_SESSIONS_REVOKED = "all_sessions_revoked"
LOGIN_LOCKED_OUT = "login_locked_out"
UNAUTHORIZED_ACCESS_ATTEMPT = "unauthorized_access_attempt"


def record_admin_audit(admin_username: str, action: str, detail: dict | None = None) -> None:
    try:
        db = SessionLocal()
        try:
            db.add(
                AdminActivityLog(
                    admin_username=admin_username,
                    action=action,
                    detail=json.dumps(detail or {}, default=str)[:2000],
                )
            )
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("failed to persist audit entry action=%s for %s", action, admin_username)
        finally:
            db.close()
    except Exception:
        logger.exception("record_admin_audit itself failed for %s/%s (request is unaffected)", admin_username, action)
