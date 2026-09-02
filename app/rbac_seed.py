"""Idempotent seeding of the two system Role rows the permission engine
(app/permissions.py) resolves by name: "Admin (Default)" (full access to
every business module -- preserves what every pre-existing `role="admin"`
AdminUser already had before this feature shipped) and "Super Access"
(full access to every business module, with users_roles/system_health
hardcoded unreachable regardless of this matrix -- see check_permission).

Called once at startup from app/main.py, after seed_if_empty(). Safe to run
on every boot: only creates rows that don't already exist, never touches
Developer-created custom roles.
"""

from app.database import SessionLocal
from app.models import Role, RolePermission
from app.permissions import ADMIN_DEFAULT_ROLE_NAME, DEVELOPER_ONLY_MODULES, MODULES, SUPER_ACCESS_ROLE_NAME

FULL_ACCESS = dict(
    can_view=True, can_create=True, can_edit=True, can_delete=True,
    can_export=True, can_print=True, can_approve=True, can_cancel=True,
)


def _ensure_role(db, name: str, description: str, modules: list[str]) -> None:
    role = db.query(Role).filter(Role.name == name).first()
    if not role:
        role = Role(name=name, description=description, is_system=True, created_by="system")
        db.add(role)
        db.flush()

    existing_modules = {rp.module for rp in db.query(RolePermission).filter(RolePermission.role_id == role.id)}
    for module in modules:
        if module not in existing_modules:
            db.add(RolePermission(role_id=role.id, module=module, **FULL_ACCESS))


def seed_rbac_defaults(SessionLocalFactory=SessionLocal) -> None:
    db = SessionLocalFactory()
    try:
        _ensure_role(
            db,
            ADMIN_DEFAULT_ROLE_NAME,
            "Backward-compatible full business access -- what every Admin account already had before "
            "module-level permissions existed. Assign a Custom role instead for anything scoped down.",
            [m for m in MODULES if m not in DEVELOPER_ONLY_MODULES],
        )
        _ensure_role(
            db,
            SUPER_ACCESS_ROLE_NAME,
            "Complete business access. Cannot reach Developer-only technical modules "
            "regardless of this matrix -- enforced in app/permissions.py, not just here.",
            [m for m in MODULES if m not in DEVELOPER_ONLY_MODULES],
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
