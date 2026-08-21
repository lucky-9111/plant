import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.middleware.sessions import SessionMiddleware

from app.database import Base, SessionLocal, engine
from app.routers import api_admin, api_customer, api_public
from app.seed_data import seed_if_empty

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

Base.metadata.create_all(bind=engine)
seed_if_empty(SessionLocal)

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
    conn.execute(text("UPDATE admin_users SET role = 'developer' WHERE username = 'admin'"))
    conn.commit()

    customer_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(customers)"))}
    if "reset_token" not in customer_columns:
        conn.execute(text("ALTER TABLE customers ADD COLUMN reset_token VARCHAR(100)"))
        conn.commit()
    if "reset_token_expires" not in customer_columns:
        conn.execute(text("ALTER TABLE customers ADD COLUMN reset_token_expires DATETIME"))
        conn.commit()

    order_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(orders)"))}
    if "razorpay_order_id" not in order_columns:
        conn.execute(text("ALTER TABLE orders ADD COLUMN razorpay_order_id VARCHAR(100)"))
        conn.commit()
    if "razorpay_payment_id" not in order_columns:
        conn.execute(text("ALTER TABLE orders ADD COLUMN razorpay_payment_id VARCHAR(100)"))
        conn.commit()
    if "razorpay_signature" not in order_columns:
        conn.execute(text("ALTER TABLE orders ADD COLUMN razorpay_signature VARCHAR(255)"))
        conn.commit()

    # Seedlings & Trays: cart_items needs a nullable variant_id, and its unique
    # constraint must widen to (customer_id, plant_id, variant_id) so a customer
    # can hold multiple tray sizes of the same seedling as separate cart lines.
    # SQLite bakes UNIQUE(...) into an unnamed autoindex, so it can't be dropped
    # by name -- rebuild the table instead (standard SQLite migration pattern).
    cart_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(cart_items)"))}
    if "variant_id" not in cart_columns:
        conn.execute(text("""
            CREATE TABLE cart_items_new (
                id INTEGER NOT NULL PRIMARY KEY,
                customer_id INTEGER NOT NULL,
                plant_id INTEGER NOT NULL,
                variant_id INTEGER,
                quantity INTEGER,
                created_at DATETIME,
                UNIQUE (customer_id, plant_id, variant_id)
            )
        """))
        conn.execute(text("""
            INSERT INTO cart_items_new (id, customer_id, plant_id, variant_id, quantity, created_at)
            SELECT id, customer_id, plant_id, NULL, quantity, created_at FROM cart_items
        """))
        conn.execute(text("DROP TABLE cart_items"))
        conn.execute(text("ALTER TABLE cart_items_new RENAME TO cart_items"))
        conn.commit()

    order_item_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(order_items)"))}
    if "variant_id" not in order_item_columns:
        conn.execute(text("ALTER TABLE order_items ADD COLUMN variant_id INTEGER"))
        conn.commit()
    if "tray_size" not in order_item_columns:
        conn.execute(text("ALTER TABLE order_items ADD COLUMN tray_size INTEGER"))
        conn.commit()

app = FastAPI(title="Aaiji Nursery")




@app.get("/")
def serve_home():
    if FRONTEND_DIST.exists():
        return FileResponse(FRONTEND_DIST / "index.html")
    return {"message": "Frontend not built"}

SESSION_SECRET_KEY = os.environ.get("SESSION_SECRET_KEY")
if not SESSION_SECRET_KEY:
    raise RuntimeError(
        "SESSION_SECRET_KEY environment variable is not set. "
        "Copy .env.example to .env and set a random secret before starting the server "
        "(login/admin sessions cannot be signed safely without it)."
    )

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET_KEY)

# Dev-only: allow the Vite dev server (or direct API calls) from localhost and
# any private LAN IP to hit this API with cookies, so a second laptop on the
# same Wi-Fi can be used for testing. Not safe for production as-is.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_public.router)
app.include_router(api_admin.router)
app.include_router(api_customer.router)

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_react_app(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
