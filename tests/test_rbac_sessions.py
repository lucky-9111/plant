"""Phase 2 coverage: login lockout, session revoke/revoke-all, admin
enable/disable -- the pieces that make Developer Dashboard "Sessions" and
"Login Attempts" pages meaningful.

Each test uses `make_admin` with a unique username rather than the shared
`plain_admin` fixture, since these tests assert exact session/lockout
counts for "their" admin and the test database is shared across the whole
pytest session (not reset between tests).
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


def _user_id(dev, username):
    return next(u["id"] for u in dev.get("/api/admin/admins").json() if u["username"] == username)


def test_lockout_after_repeated_bad_passwords(client, make_admin):
    user = make_admin("lockout_user")
    for _ in range(5):
        r = client.post("/api/auth/login", json={"identifier": user["username"], "password": "wrong"})
        assert r.status_code == 401

    # 6th attempt (even with the correct password) is now locked out
    r = client.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})
    assert r.status_code == 403


def test_revoke_single_session_logs_out_only_that_browser(make_admin):
    user = make_admin("session_user_a")
    browser_a = TestClient(app)
    browser_b = TestClient(app)
    browser_a.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})
    browser_b.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})

    assert browser_a.get("/api/auth/me").status_code == 200
    assert browser_b.get("/api/auth/me").status_code == 200

    dev = _developer_client()
    user_id = _user_id(dev, user["username"])
    sessions = dev.get(f"/api/admin/rbac/sessions?admin_user_id={user_id}").json()
    assert len(sessions) == 2

    dev.post(f"/api/admin/rbac/sessions/{sessions[0]['id']}/revoke")

    statuses = {browser_a.get("/api/auth/me").status_code, browser_b.get("/api/auth/me").status_code}
    assert statuses == {200, 401}  # exactly one of the two got revoked, not both


def test_revoke_all_sessions(make_admin):
    user = make_admin("session_user_b")
    browser = TestClient(app)
    browser.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})
    assert browser.get("/api/auth/me").status_code == 200

    dev = _developer_client()
    user_id = _user_id(dev, user["username"])
    r = dev.post(f"/api/admin/rbac/users/{user_id}/revoke-all-sessions")
    assert r.status_code == 200

    assert browser.get("/api/auth/me").status_code == 401


def test_disable_admin_blocks_next_request(make_admin):
    user = make_admin("disable_user")
    browser = TestClient(app)
    browser.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})
    assert browser.get("/api/auth/me").status_code == 200

    dev = _developer_client()
    user_id = _user_id(dev, user["username"])
    r = dev.put(f"/api/admin/rbac/admins/{user_id}/status", params={"is_active": False})
    assert r.status_code == 200

    assert browser.get("/api/auth/me").status_code == 401

    # re-enable restores access without a new password
    dev.put(f"/api/admin/rbac/admins/{user_id}/status", params={"is_active": True})
    r = TestClient(app).post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})
    assert r.status_code == 200


def test_password_reset_revokes_existing_sessions(make_admin):
    user = make_admin("reset_user")
    browser = TestClient(app)
    browser.post("/api/auth/login", json={"identifier": user["username"], "password": user["password"]})
    assert browser.get("/api/auth/me").status_code == 200

    dev = _developer_client()
    user_id = _user_id(dev, user["username"])
    r = dev.put(f"/api/admin/admins/{user_id}/password", json={"password": "new-pass-456"})
    assert r.status_code == 200

    assert browser.get("/api/auth/me").status_code == 401
