"""Wipe and repopulate aaiji_nursery.db with realistic placeholder content.

Run with: python seed.py
Safe to re-run - it wipes and recreates all tables, including admin_users,
customers, and orders. Use this for local dev resets, not on a live database
with real orders (the live site instead auto-seeds empty catalog tables on
startup - see app/seed_data.py:seed_if_empty).
"""
from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import AdminUser
from app.seed_data import populate_catalog

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

db.add(AdminUser(username="admin", hashed_password=hash_password("aaiji@admin123")))
populate_catalog(db)

db.commit()
db.close()

print("Database seeded successfully.")
print("Admin login -> username: admin | password: aaiji@admin123")
