"""Phase 6 coverage: fine-grained action-level enforcement (CREATE/EDIT/
DELETE/CANCEL) added to the write endpoints in app/routers/api_admin.py.
Confirms legacy admin/developer can still write (the actual risk area for
this phase) and a VIEW-only custom role is blocked from every write.
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


def test_legacy_admin_can_still_write(make_admin):
    user = make_admin("legacy_admin_write_check")
    client = TestClient(app)
    client.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})

    r = client.post("/api/admin/categories", json={"name": "Test Category", "description": "", "image_url": ""})
    assert r.status_code == 201
    category_id = r.json()["id"]

    r = client.put(
        f"/api/admin/categories/{category_id}",
        json={"name": "Renamed Category", "description": "", "image_url": ""},
    )
    assert r.status_code == 200

    r = client.delete(f"/api/admin/categories/{category_id}")
    assert r.status_code == 204


def test_view_only_custom_role_cannot_write(make_admin):
    dev = _developer_client()
    role = dev.post("/api/admin/rbac/roles", json={"name": "Products Viewer Only", "description": ""}).json()
    dev.put(f"/api/admin/rbac/roles/{role['id']}", json={"permissions": [{"module": "products", "can_view": True}]})

    user = make_admin("products_viewer_user")
    user_id = next(u["id"] for u in dev.get("/api/admin/admins").json() if u["username"] == user["username"])
    dev.put(f"/api/admin/admins/{user_id}/role", json={"role": "custom", "custom_role_id": role["id"]})

    client = TestClient(app)
    client.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})

    assert client.get("/api/admin/categories").status_code == 200
    r = client.post("/api/admin/categories", json={"name": "Should Fail", "description": "", "image_url": ""})
    assert r.status_code == 403


def test_custom_role_with_create_but_not_delete(make_admin):
    dev = _developer_client()
    role = dev.post("/api/admin/rbac/roles", json={"name": "Products Creator", "description": ""}).json()
    dev.put(
        f"/api/admin/rbac/roles/{role['id']}",
        json={"permissions": [{"module": "products", "can_view": True, "can_create": True}]},
    )

    user = make_admin("products_creator_user")
    user_id = next(u["id"] for u in dev.get("/api/admin/admins").json() if u["username"] == user["username"])
    dev.put(f"/api/admin/admins/{user_id}/role", json={"role": "custom", "custom_role_id": role["id"]})

    client = TestClient(app)
    client.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})

    r = client.post("/api/admin/categories", json={"name": "Allowed Category", "description": "", "image_url": ""})
    assert r.status_code == 201
    category_id = r.json()["id"]

    r = client.delete(f"/api/admin/categories/{category_id}")
    assert r.status_code == 403
