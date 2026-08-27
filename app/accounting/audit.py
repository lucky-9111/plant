"""Structured, field-level audit trail for the accounting module -- one row
per changed field (not one row per action), so audit history is queryable
by field, unlike the existing shallow AdminActivityLog free-text logger."""

from sqlalchemy.orm import Session

from app.accounting.models import AuditLog


def record_change(
    db: Session,
    table_name: str,
    record_id: int,
    action: str,
    changed_by: str = "",
    changes: dict | None = None,
):
    """`changes` is a dict of {field_name: (old_value, new_value)}. Pass None
    (or an empty dict) for whole-row actions with no per-field diff (e.g. a
    fresh create) -- a single row with field_name=None is written instead."""
    if not changes:
        db.add(AuditLog(table_name=table_name, record_id=record_id, action=action, changed_by=changed_by))
        return
    for field_name, (old_value, new_value) in changes.items():
        db.add(
            AuditLog(
                table_name=table_name,
                record_id=record_id,
                action=action,
                field_name=field_name,
                old_value=None if old_value is None else str(old_value),
                new_value=None if new_value is None else str(new_value),
                changed_by=changed_by,
            )
        )
