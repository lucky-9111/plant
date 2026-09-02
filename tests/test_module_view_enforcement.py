"""Phase 4 coverage: router-level module-VIEW enforcement added in
app/main.py for the Accounting/Labour/Delivery/Analytics routers. Confirms
existing roles are unaffected (backward compatibility) and a Custom role
without VIEW on that module is denied entry to the module entirely.
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


def test_legacy_admin_and_developer_still_reach_accounting(make_admin):
    dev = _developer_client()
    assert dev.get("/api/admin/accounting/overview").status_code == 200

    user = make_admin("legacy_admin_accounting_check")
    plain = TestClient(app)
    plain.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})
    assert plain.get("/api/admin/accounting/overview").status_code == 200


def test_custom_role_without_module_view_is_denied(make_admin):
    dev = _developer_client()
    role = dev.post("/api/admin/rbac/roles", json={"name": "No Accounting Role", "description": ""}).json()
    # deliberately give it VIEW on a different module, not accounting
    dev.put(f"/api/admin/rbac/roles/{role['id']}", json={"permissions": [{"module": "website", "can_view": True}]})

    user = make_admin("no_accounting_user")
    user_id = next(u["id"] for u in dev.get("/api/admin/admins").json() if u["username"] == user["username"])
    dev.put(f"/api/admin/admins/{user_id}/role", json={"role": "custom", "custom_role_id": role["id"]})

    as_user = TestClient(app)
    as_user.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})
    r = as_user.get("/api/admin/accounting/overview")
    assert r.status_code == 403


def test_custom_role_with_module_view_is_allowed(make_admin):
    dev = _developer_client()
    role = dev.post("/api/admin/rbac/roles", json={"name": "Accounting Viewer Role", "description": ""}).json()
    dev.put(f"/api/admin/rbac/roles/{role['id']}", json={"permissions": [{"module": "accounting", "can_view": True}]})

    user = make_admin("accounting_viewer_user")
    user_id = next(u["id"] for u in dev.get("/api/admin/admins").json() if u["username"] == user["username"])
    dev.put(f"/api/admin/admins/{user_id}/role", json={"role": "custom", "custom_role_id": role["id"]})

    as_user = TestClient(app)
    as_user.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})
    r = as_user.get("/api/admin/accounting/overview")
    assert r.status_code == 200
