"""Minimal smoke coverage for the unified auth flow (app/api_public.py),
giving the Developer Dashboard RBAC phases something concrete to run
against. Not exhaustive -- just enough to catch a broken login/session/
logout path before it reaches production.
"""

import os

DEFAULT_ADMIN_USERNAME = os.environ["DEFAULT_ADMIN_USERNAME"]
DEFAULT_ADMIN_PASSWORD = os.environ["DEFAULT_ADMIN_PASSWORD"]


def test_developer_login_me_logout(client):
    r = client.post("/api/auth/login", json={"identifier": DEFAULT_ADMIN_USERNAME, "password": DEFAULT_ADMIN_PASSWORD})
    assert r.status_code == 200
    assert r.json()["type"] == "developer"

    r = client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["username"] == DEFAULT_ADMIN_USERNAME

    r = client.post("/api/auth/logout")
    assert r.status_code == 200

    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_admin_login(client, plain_admin):
    r = client.post("/api/auth/login", json={"identifier": plain_admin["username"], "password": plain_admin["password"]})
    assert r.status_code == 200
    assert r.json()["type"] == "admin"


def test_invalid_login_rejected(client):
    r = client.post("/api/auth/login", json={"identifier": DEFAULT_ADMIN_USERNAME, "password": "wrong-password"})
    assert r.status_code == 401


def test_customer_register_and_login(client):
    r = client.post(
        "/api/customer/register",
        json={
            "name": "Test Customer",
            "email": "test.customer@example.com",
            "mobile": "9999999999",
            "password": "customer-pass-123",
        },
    )
    assert r.status_code == 201

    r = client.post("/api/auth/login", json={"identifier": "test.customer@example.com", "password": "customer-pass-123"})
    assert r.status_code == 200
    assert r.json()["type"] == "customer"


def test_non_developer_cannot_reach_developer_only_endpoints(client, plain_admin):
    client.post("/api/auth/login", json={"identifier": plain_admin["username"], "password": plain_admin["password"]})
    r = client.get("/api/admin/activity-log")
    assert r.status_code == 403
