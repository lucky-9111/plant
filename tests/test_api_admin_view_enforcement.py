"""Phase 5 coverage: per-endpoint module-VIEW dependencies added to the
shared website/products/orders/customers router (app/routers/api_admin.py).
Confirms legacy admin/developer access is unaffected and a Custom role is
scoped to exactly the modules its role was granted.
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


def test_legacy_admin_reaches_every_gated_module(make_admin):
    user = make_admin("legacy_admin_wide_check")
    client = TestClient(app)
    client.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})

    assert client.get("/api/admin/categories").status_code == 200
    assert client.get("/api/admin/plants").status_code == 200
    assert client.get("/api/admin/services").status_code == 200
    assert client.get("/api/admin/orders").status_code == 200
    assert client.get("/api/admin/customers").status_code == 200
    assert client.get("/api/admin/settings").status_code == 200


def test_custom_role_scoped_to_orders_only_cannot_reach_website(make_admin):
    dev = _developer_client()
    role = dev.post("/api/admin/rbac/roles", json={"name": "Orders Only", "description": ""}).json()
    dev.put(f"/api/admin/rbac/roles/{role['id']}", json={"permissions": [{"module": "orders", "can_view": True}]})

    user = make_admin("orders_only_user")
    user_id = next(u["id"] for u in dev.get("/api/admin/admins").json() if u["username"] == user["username"])
    dev.put(f"/api/admin/admins/{user_id}/role", json={"role": "custom", "custom_role_id": role["id"]})

    client = TestClient(app)
    client.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})

    assert client.get("/api/admin/orders").status_code == 200
    assert client.get("/api/admin/services").status_code == 403
    assert client.get("/api/admin/categories").status_code == 403
    assert client.get("/api/admin/customers").status_code == 403
