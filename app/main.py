import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.middleware.sessions import SessionMiddleware

from app.database import Base, engine
from app.routers import api_admin, api_public

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    existing_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(inquiries)"))}
    if "plant_id" not in existing_columns:
        conn.execute(text("ALTER TABLE inquiries ADD COLUMN plant_id INTEGER"))
        conn.commit()

    admin_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(admin_users)"))}
    if "role" not in admin_columns:
        conn.execute(text("ALTER TABLE admin_users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin'"))
        conn.commit()
    if "created_at" not in admin_columns:
        conn.execute(text("ALTER TABLE admin_users ADD COLUMN created_at DATETIME"))
        conn.commit()
    conn.execute(text("UPDATE admin_users SET role = 'developer' WHERE username = 'lucky'"))
    conn.commit()

app = FastAPI(title="Aaiji Nursery")




@app.get("/")
def serve_home():
    if FRONTEND_DIST.exists():
        return FileResponse(FRONTEND_DIST / "index.html")
    return {"message": "Frontend not built"}

app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("SESSION_SECRET_KEY", "aaiji-nursery-dev-secret-change-me"),
)

app.include_router(api_public.router)
app.include_router(api_admin.router)

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_react_app(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
