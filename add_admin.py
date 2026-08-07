"""Add a new admin user without wiping existing data.

Usage:
    python add_admin.py

Edit USERNAME and PASSWORD below before running.
Do NOT use seed.py for this - seed.py wipes and recreates the whole database.
"""
from app.auth import hash_password
from app.database import SessionLocal
from app.models import AdminUser

USERNAME = "ram"
PASSWORD = "ram123"

db = SessionLocal()
try:
    existing = db.query(AdminUser).filter(AdminUser.username == USERNAME).first()
    if existing:
        print(f"Admin '{USERNAME}' already exists, skipping.")
    else:
        db.add(AdminUser(username=USERNAME, hashed_password=hash_password(PASSWORD)))
        db.commit()
        print(f"Admin '{USERNAME}' created.")
finally:
    db.close()
