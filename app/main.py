import logging
import os
import time
import uuid
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

from app import api_public

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.middleware.sessions import SessionMiddleware

from app.accounting.router import router as accounting_router
from app.delivery.router import router as delivery_router
from app.labour.router import router as labour_router
from app.database import Base, SessionLocal, engine
from app.monitoring.module_map import infer_module
from app.monitoring.recorder import record_error, record_request_outcome
from app.routers import api_admin, api_admin_analytics, api_customer, api_system_health
from app.seed_data import seed_if_empty

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

Base.metadata.create_all(bind=engine)

# Schema shims (ALTER TABLE for pre-existing tables) must run before
# seed_if_empty -- seeding queries ORM models whose Python class already
# declares newly-added columns, so the actual on-disk table must have them
# first or SQLAlchemy raises "no such column" on a fresh migration.
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
    if "accounting_role" not in admin_columns:
        conn.execute(text("ALTER TABLE admin_users ADD COLUMN accounting_role VARCHAR(20)"))
        # Backfill every admin that existed before Phase 4 to Owner so nobody
        # who already had unrestricted Accounting access loses it -- only
        # admins created after this point default to NULL (-> Viewer).
        conn.execute(text("UPDATE admin_users SET accounting_role = 'Owner' WHERE accounting_role IS NULL"))
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
    if "idempotency_key" not in order_columns:
        # Lets checkout() detect a network-retried submit (same key resubmitted
        # after the client never saw the first response) and return the
        # already-created order instead of placing a duplicate one.
        conn.execute(text("ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(64)"))
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

    # Accounting module: extends the existing Purchase table (rather than a
    # duplicate "Bill" table) with status/due_date/source/contact_id. Existing
    # rows backfill to status='Paid' since every Purchase recorded before this
    # column existed represented an already-settled procurement event.
    purchase_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(purchases)"))}
    if "status" not in purchase_columns:
        conn.execute(text("ALTER TABLE purchases ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Paid'"))
        conn.commit()
    if "due_date" not in purchase_columns:
        conn.execute(text("ALTER TABLE purchases ADD COLUMN due_date DATETIME"))
        conn.commit()
    if "source" not in purchase_columns:
        conn.execute(text("ALTER TABLE purchases ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'offline'"))
        conn.commit()
    if "contact_id" not in purchase_columns:
        conn.execute(text("ALTER TABLE purchases ADD COLUMN contact_id INTEGER"))
        conn.commit()
    if "purchase_order_id" not in purchase_columns:
        conn.execute(text("ALTER TABLE purchases ADD COLUMN purchase_order_id INTEGER"))
        conn.commit()

    # Employee & Labour module: extends the existing accounting_employees
    # table (Phase 2's simple directory) with real HR/payroll fields. The
    # existing simple CRUD page/router keep working unchanged -- they just
    # never read or write these new columns.
    employee_columns = {row[1] for row in conn.execute(text("PRAGMA table_info(accounting_employees)"))}
    if "department" not in employee_columns:
        conn.execute(text("ALTER TABLE accounting_employees ADD COLUMN department VARCHAR(100) DEFAULT ''"))
        conn.commit()
    if "overtime_rate" not in employee_columns:
        conn.execute(text("ALTER TABLE accounting_employees ADD COLUMN overtime_rate FLOAT DEFAULT 0"))
        conn.commit()
    if "status" not in employee_columns:
        conn.execute(text("ALTER TABLE accounting_employees ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Active'"))
        conn.commit()
    if "payment_method" not in employee_columns:
        conn.execute(text("ALTER TABLE accounting_employees ADD COLUMN payment_method VARCHAR(20) DEFAULT 'Cash'"))
        conn.commit()
    if "bank_details" not in employee_columns:
        conn.execute(text("ALTER TABLE accounting_employees ADD COLUMN bank_details TEXT DEFAULT ''"))
        conn.commit()

seed_if_empty(SessionLocal)

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

request_logger = logging.getLogger("app.requests")


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = f"REQ-{datetime.utcnow():%Y%m%d-%H%M%S}-{uuid.uuid4().hex[:4]}"
    request.state.request_id = request_id
    start = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception as exc:
        # Anything reaching here is a genuinely unhandled bug -- every
        # `raise HTTPException(...)` in the app (185 call sites) is already
        # converted to a clean JSONResponse by Starlette's own
        # ExceptionMiddleware, which sits between the router and this
        # middleware, so it never lands in this branch.
        elapsed_ms = (time.perf_counter() - start) * 1000
        module, sub_module, func_name, endpoint = infer_module(request)
        request_logger.exception(
            "unhandled error request_id=%s module=%s function=%s endpoint=%s",
            request_id, module, func_name, endpoint,
        )
        record_error(module, sub_module, func_name, endpoint, request.method, 500, request_id, exc, elapsed_ms)
        record_request_outcome(module, sub_module, func_name, endpoint, request.method, 500, request_id, elapsed_ms)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "detail": "Something went wrong on our end. Please try again in a moment.",
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Something went wrong on our end. Please try again in a moment.",
                },
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )

    elapsed_ms = (time.perf_counter() - start) * 1000
    module, sub_module, func_name, endpoint = infer_module(request)
    record_request_outcome(module, sub_module, func_name, endpoint, request.method, response.status_code, request_id, elapsed_ms)
    response.headers["X-Request-ID"] = request_id
    return response


app.include_router(api_public.router)
app.include_router(api_admin.router)
app.include_router(api_admin_analytics.router)
app.include_router(api_system_health.router)
app.include_router(accounting_router)
app.include_router(labour_router)
app.include_router(delivery_router)
app.include_router(api_customer.router)

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_react_app(full_path: str):
        candidate = (FRONTEND_DIST / full_path).resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(FRONTEND_DIST.resolve()):
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")





























