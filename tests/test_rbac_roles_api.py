"""Phase 3 coverage: Roles/Permissions/Overrides REST endpoints in
app/routers/api_admin_rbac.py -- all Developer-only, custom-role CRUD,
and the system-role guardrails (can't edit/delete Admin (Default) or
Super Access).
"""

import os

from fastapi.testclient import TestClient

from app.main import app

DEFAULT_ADMIN_USERNAME = os.environ["DEFAULT_ADMIN_USERNAME"]
DEFAULT_ADMIN_PASSWORD = os.environ["DEFAULT_ADMIN_PASSWORD"]


def _developer_client():
    dev = TestClient(app)
    r = dev.post("/api/auth/login", json={"identifier": DEFAULT_ADMIN_USERNAME, "password": DEFAULT_ADMIN_PASSWORD})
    assert r.status_code == 200
    return dev


def test_system_roles_are_seeded_and_protected():
    dev = _developer_client()
    roles = dev.get("/api/admin/rbac/roles").json()
    names = {r["name"] for r in roles}
    assert "Admin (Default)" in names
    assert "Super Access" in names

    admin_default = next(r for r in roles if r["name"] == "Admin (Default)")
    assert admin_default["is_system"] is True

    r = dev.put(f"/api/admin/rbac/roles/{admin_default['id']}", json={"description": "nope"})
    assert r.status_code == 400

    r = dev.delete(f"/api/admin/rbac/roles/{admin_default['id']}")
    assert r.status_code == 400


def test_custom_role_crud_and_assignment(make_admin):
    dev = _developer_client()

    r = dev.post("/api/admin/rbac/roles", json={"name": "Website Manager", "description": "Website only"})
    assert r.status_code == 201
    role = r.json()

    r = dev.put(
        f"/api/admin/rbac/roles/{role['id']}",
        json={"permissions": [{"module": "website", "can_view": True, "can_edit": True}]},
    )
    assert r.status_code == 200
    updated = r.json()
    website_perm = next(p for p in updated["permissions"] if p["module"] == "website")
    assert website_perm["can_view"] is True
    assert website_perm["can_edit"] is True
    assert website_perm["can_delete"] is False

    user = make_admin("custom_role_user")
    user_id = next(u["id"] for u in dev.get("/api/admin/admins").json() if u["username"] == user["username"])
    r = dev.put(f"/api/admin/admins/{user_id}/role", json={"role": "custom", "custom_role_id": role["id"]})
    assert r.status_code == 200

    # a separate client -- logging in as the custom-role user on `dev` itself
    # would overwrite the developer's own session cookie
    as_custom_user = TestClient(app)
    r = as_custom_user.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})
    assert r.status_code == 200
    perms = r.json()["permissions"]
    assert perms["website"]["VIEW"] is True
    assert perms["accounting"]["VIEW"] is False

    # deleting a role still in use is refused
    r = dev.delete(f"/api/admin/rbac/roles/{role['id']}")
    assert r.status_code == 400


def test_custom_role_requires_valid_custom_role_id(make_admin):
    dev = _developer_client()
    user = make_admin("bad_custom_role_user")
    user_id = next(u["id"] for u in dev.get("/api/admin/admins").json() if u["username"] == user["username"])
    r = dev.put(f"/api/admin/admins/{user_id}/role", json={"role": "custom", "custom_role_id": 999999})
    assert r.status_code == 400


def test_permission_overrides_crud(make_admin):
    dev = _developer_client()
    user = make_admin("override_user")
    user_id = next(u["id"] for u in dev.get("/api/admin/admins").json() if u["username"] == user["username"])

    r = dev.post(
        f"/api/admin/rbac/users/{user_id}/overrides",
        json={"module": "orders", "action": "DELETE", "effect": "DENY", "reason": "test"},
    )
    assert r.status_code == 201
    override = r.json()

    overrides = dev.get(f"/api/admin/rbac/users/{user_id}/overrides").json()
    assert len(overrides) == 1

    r = dev.delete(f"/api/admin/rbac/users/{user_id}/overrides/{override['id']}")
    assert r.status_code == 204
    assert dev.get(f"/api/admin/rbac/users/{user_id}/overrides").json() == []
