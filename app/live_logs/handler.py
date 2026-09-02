"""Bridges the standard library `logging` module into the live-log hub, so
every REAL `logger.info()/.warning()/.error()` call anywhere in the app
becomes visible in the Developer Live Logs terminal -- no second, fake
logging path is invented (master prompt section 21).

Adds a SUCCESS level (25, between INFO and WARNING) since Python's logging
module has no built-in equivalent, matching the level set the prompt asks
for (section 5).
"""
import logging

from app.live_logs.hub import hub
from app.live_logs.redact import redact

SUCCESS = 25
logging.addLevelName(SUCCESS, "SUCCESS")


def log_success(logger: logging.Logger, msg: str, *args, **kwargs) -> None:
    logger.log(SUCCESS, msg, *args, **kwargs)


_LEVEL_NAMES = {
    logging.DEBUG: "DEBUG",
    logging.INFO: "INFO",
    SUCCESS: "SUCCESS",
    logging.WARNING: "WARNING",
    logging.ERROR: "ERROR",
    logging.CRITICAL: "CRITICAL",
}


class LiveLogHandler(logging.Handler):
    """Attached to the root logger so it sees anything that propagates up
    from any named logger in the app, without every module needing to know
    this feature exists."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = _LEVEL_NAMES.get(record.levelno, record.levelname)
            message = redact(record.getMessage())
            hub.emit(
                level=level,
                message=message,
                service=getattr(record, "service", None) or record.name.split(".")[0],
                module=getattr(record, "module_name", None) or record.name,
                job_id=getattr(record, "job_id", None),
                request_id=getattr(record, "request_id", None),
                user=getattr(record, "user", None),
            )
        except Exception:
            pass  # a logging bridge must never itself raise
