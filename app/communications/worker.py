"""The message queue + background worker (section 9). No Celery/Redis
exists anywhere in this project (single uvicorn process + SQLite) -- this
mirrors the exact pattern already proven safe by app/live_logs/hub.py and
app/order_alerts/hub.py: a stdlib queue drained by one daemon thread,
started once at app startup.

Every WhatsApp send happens here, AFTER the caller's own business
transaction has already committed -- never inline inside checkout/invoice/
delivery code, so a slow or failing AiSensy call can never block or break
those requests (section 30).
"""
import json
import logging
import queue
import threading
from datetime import datetime

from app.communications.models import WhatsAppMessage, WhatsAppTemplate
from app.communications.provider import get_provider, get_provider_name
from app.database import SessionLocal
from app.monitoring.recorder import record_error

logger = logging.getLogger("communications.worker")

MAX_RETRY_DEFAULT = 3
BACKOFF_BASE_SECONDS = 5

_job_queue: "queue.Queue[int]" = queue.Queue()
_started = False


def _mask_mobile(mobile: str) -> str:
    """Never log a full phone number -- keep enough to recognize/debug a
    specific contact without exposing the whole number (e.g. "+9179****779")."""
    if not mobile or len(mobile) < 6:
        return "***"
    return f"{mobile[:5]}****{mobile[-3:]}"


def enqueue_message(message_id: int) -> None:
    _job_queue.put(message_id)


def _process_one(message_id: int) -> None:
    db = SessionLocal()
    try:
        msg = db.query(WhatsAppMessage).filter(WhatsAppMessage.id == message_id).first()
        if not msg or msg.status != "QUEUED":
            return

        msg.status = "PROCESSING"
        db.commit()
        masked = _mask_mobile(msg.mobile)
        provider_name = get_provider_name()
        logger.info(
            "Processing WhatsApp message message_id=%s event=%s source=%s/%s customer_id=%s mobile=%s template=%s provider=%s",
            msg.id, msg.event_type, msg.source_module, msg.source_id, msg.customer_id, masked, msg.template_name, provider_name,
        )

        try:
            params = json.loads(msg.template_params) if msg.template_params else []
        except (ValueError, TypeError):
            params = []

        template_row = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.name == msg.template_name).first()
        try:
            variable_names = json.loads(template_row.variables) if template_row and template_row.variables else None
        except (ValueError, TypeError):
            variable_names = None

        logger.info("Sending request to %s message_id=%s template=%s mobile=%s", provider_name, msg.id, msg.template_name, masked)
        provider = get_provider()
        result = provider.send_template_message(msg.mobile, msg.template_name, params, variable_names=variable_names)

        if result.ok:
            msg.status = "SENT"
            msg.provider_message_id = result.provider_message_id
            msg.sent_at = datetime.utcnow()
            msg.error_code = ""
            msg.error_message = ""
            logger.info(
                "%s accepted message message_id=%s provider_message_id=%s delivery_status=SENT",
                provider_name, msg.id, result.provider_message_id,
            )
        else:
            msg.error_code = result.error_code
            msg.error_message = (result.error_message or "")[:500]
            max_retry = MAX_RETRY_DEFAULT
            if result.retryable and msg.retry_count < max_retry:
                msg.retry_count += 1
                msg.status = "QUEUED"
                delay = BACKOFF_BASE_SECONDS * (2 ** (msg.retry_count - 1))
                logger.info(
                    "WhatsApp send failed message_id=%s meta_error_code=%s meta_error_message=%s -- retry %s/%s in %ss",
                    msg.id, result.error_code, result.error_message, msg.retry_count, max_retry, delay,
                )
                threading.Timer(delay, enqueue_message, args=(msg.id,)).start()
            else:
                msg.status = "FAILED"
                msg.failed_at = datetime.utcnow()
                logger.info(
                    "WhatsApp send permanently failed message_id=%s template=%s meta_error_code=%s meta_error_message=%s delivery_status=FAILED",
                    msg.id, msg.template_name, result.error_code, result.error_message,
                )
                record_error(
                    "Communications", "WhatsApp", "send_template_message", f"external:{provider_name}", "EXTERNAL", 502,
                    None, None, error_code=result.error_code, message=result.error_message,
                )
                # Surface the real provider error on the template itself too
                # (Admin > Templates "Last Error" column) -- never changes
                # `status` automatically, since only an admin confirming
                # real Meta approval may promote a template to ACTIVE.
                if template_row:
                    template_row.last_error = f"{result.error_code}: {result.error_message}"[:1000]
        db.commit()
    except Exception as exc:  # noqa: BLE001 - a worker crash must never take down the app
        db.rollback()
        logger.exception("Unhandled error processing WhatsApp message_id=%s", message_id)
        record_error("Communications", "WhatsApp", "_process_one", "internal:whatsapp-worker", "INTERNAL", 500, None, exc)
    finally:
        db.close()


def _worker_loop() -> None:
    while True:
        message_id = _job_queue.get()
        try:
            _process_one(message_id)
        finally:
            _job_queue.task_done()


def start_worker() -> None:
    global _started
    if _started:
        return
    _started = True
    threading.Thread(target=_worker_loop, name="whatsapp-worker", daemon=True).start()
    logger.info("WhatsApp worker thread started")
