"""Phase 3 coverage: the module-level permission engine (app/permissions.py)
and its precedence chain -- developer bypass, Super Access's hardcoded
floor on Developer-only modules, user-level overrides beating role
permissions, and default-deny when nothing grants access.
"""

from app.auth import hash_password
from app.database import SessionLocal
from app.models import AdminUser, Role, RolePermission, UserPermissionOverride
from app.permissions import check_permission


def _make_user(db, username, role, custom_role_id=None):
    user = AdminUser(username=username, hashed_password=hash_password("x"), role=role, custom_role_id=custom_role_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_developer_bypasses_everything(client):
    db = SessionLocal()
    try:
        user = _make_user(db, "perm_dev", "developer")
        assert check_permission(db, user, "users_roles", "VIEW") is True
        assert check_permission(db, user, "system_health", "DELETE") is True
    finally:
        db.close()


def test_super_access_cannot_reach_technical_modules(client):
    db = SessionLocal()
    try:
        user = _make_user(db, "perm_super", "super_access")
        assert check_permission(db, user, "accounting", "VIEW") is True  # seeded full business access
        assert check_permission(db, user, "users_roles", "VIEW") is False  # hardcoded floor
        assert check_permission(db, user, "system_health", "VIEW") is False
    finally:
        db.close()


def test_legacy_admin_role_keeps_full_business_access(client):
    db = SessionLocal()
    try:
        user = _make_user(db, "perm_admin", "admin")
        assert check_permission(db, user, "website", "DELETE") is True
        assert check_permission(db, user, "reports", "EXPORT") is True
        # even the legacy admin tier doesn't get Developer territory
        assert check_permission(db, user, "users_roles", "VIEW") is False
    finally:
        db.close()


def test_custom_role_default_deny_and_explicit_grant(client):
    db = SessionLocal()
    try:
        role = Role(name="Website Only Role", description="", is_system=False, created_by="test")
        db.add(role)
        db.commit()
        db.refresh(role)
        db.add(RolePermission(role_id=role.id, module="website", can_view=True))
        db.commit()

        user = _make_user(db, "perm_custom", "custom", custom_role_id=role.id)
        assert check_permission(db, user, "website", "VIEW") is True
        assert check_permission(db, user, "website", "DELETE") is False  # not granted in the matrix
        assert check_permission(db, user, "accounting", "VIEW") is False  # no row for this module at all
    finally:
        db.close()


def test_user_override_beats_role_permission(client):
    db = SessionLocal()
    try:
        role = Role(name="Overridable Role", description="", is_system=False, created_by="test")
        db.add(role)
        db.commit()
        db.refresh(role)
        db.add(RolePermission(role_id=role.id, module="orders", can_view=True, can_delete=True))
        db.commit()

        user = _make_user(db, "perm_override", "custom", custom_role_id=role.id)
        assert check_permission(db, user, "orders", "DELETE") is True

        # Developer explicitly takes DELETE away from this one user
        db.add(
            UserPermissionOverride(
                admin_user_id=user.id, module="orders", action="DELETE", effect="DENY", granted_by="perm_dev"
            )
        )
        db.commit()
        assert check_permission(db, user, "orders", "DELETE") is False
        assert check_permission(db, user, "orders", "VIEW") is True  # untouched

        # Developer explicitly grants CANCEL, which the role never had
        db.add(
            UserPermissionOverride(
                admin_user_id=user.id, module="orders", action="CANCEL", effect="ALLOW", granted_by="perm_dev"
            )
        )
        db.commit()
        assert check_permission(db, user, "orders", "CANCEL") is True
    finally:
        db.close()
