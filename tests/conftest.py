"""Test setup: points the app at a throwaway SQLite file (never the real
dev database) via the DATABASE_URL env override added to app/database.py,
and sets the SESSION_SECRET_KEY app/main.py requires at import time.

These env vars MUST be set before `app.main` (or anything importing it) is
first imported, since app/main.py creates tables and seeds default data as
module-level side effects at import time.
"""

import os
import tempfile
from pathlib import Path

_TMP_DB = Path(tempfile.gettempdir()) / "aaiji_test.db"
if _TMP_DB.exists():
    _TMP_DB.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ["SESSION_SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ.setdefault("DEFAULT_ADMIN_USERNAME", "admin")
os.environ.setdefault("DEFAULT_ADMIN_PASSWORD", "aaiji@admin123")

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password
from app.database import SessionLocal
from app.main import app
from app.models import AdminUser

DEFAULT_ADMIN_USERNAME = os.environ["DEFAULT_ADMIN_USERNAME"]
DEFAULT_ADMIN_PASSWORD = os.environ["DEFAULT_ADMIN_PASSWORD"]


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def plain_admin():
    """A role='admin' user distinct from the seeded default admin username,
    which app/main.py's migration shim always force-promotes to developer."""
    db = SessionLocal()
    try:
        user = db.query(AdminUser).filter(AdminUser.username == "plain_admin").first()
        if not user:
            db.add(AdminUser(username="plain_admin", hashed_password=hash_password("plain-pass-123"), role="admin"))
            db.commit()
        return {"username": "plain_admin", "password": "plain-pass-123"}
    finally:
        db.close()


@pytest.fixture()
def make_admin():
    """Factory for a uniquely-named role='admin' user, so tests that assert
    exact session/login-attempt counts for "their" admin aren't polluted by
    other tests sharing the same `plain_admin` fixture in the same
    session-wide test database."""

    def _make(username: str, password: str = "test-pass-123"):
        db = SessionLocal()
        try:
            user = db.query(AdminUser).filter(AdminUser.username == username).first()
            if not user:
                db.add(AdminUser(username=username, hashed_password=hash_password(password), role="admin"))
                db.commit()
            return {"username": username, "password": password}
        finally:
            db.close()

    return _make
