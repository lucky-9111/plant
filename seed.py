"""Wipe and repopulate aaiji_nursery.db with realistic placeholder content.

Run with: python seed.py
Safe to re-run - it wipes and recreates all tables, including admin_users,
customers, and orders. Use this for local dev resets, not on a live database
with real orders (the live site instead auto-seeds empty catalog tables on
startup - see app/seed_data.py:seed_if_empty).
"""
import os

from dotenv import load_dotenv

load_dotenv()

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import AdminUser
from app.seed_data import populate_catalog

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

admin_username = os.environ.get("DEFAULT_ADMIN_USERNAME", "admin")
admin_password = os.environ.get("DEFAULT_ADMIN_PASSWORD", "aaiji@admin123")
db.add(AdminUser(username=admin_username, hashed_password=hash_password(admin_password), role="developer"))
populate_catalog(db)

db.commit()
db.close()

print("Database seeded successfully.")
print(f"Admin login -> username: {admin_username} | password: set via DEFAULT_ADMIN_PASSWORD in your local .env")
