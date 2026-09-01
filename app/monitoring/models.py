"""Fault-isolation / error-monitoring data models.

Three tables, all brand new (no existing table is altered):

- ErrorLog: one row PER UNIQUE (module, function, error type, normalized
  message) -- repeated occurrences of the same underlying error increment
  `occurrence_count` on the same row rather than creating duplicates. Never
  auto-deleted, even once resolved (history must be retained).
- FunctionStats: one row per unique (module, function, endpoint, method),
  updated on every request whether it succeeds or fails -- this is what lets
  the admin UI show real success/failure counts instead of invented ones.
- SystemLog: a raw chronological WARNING+ stream, subject to configurable
  retention (see app/monitoring/recorder.py). Unlike ErrorLog, old rows here
  are safe to prune -- this table is not the historical error record.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Index, Integer, String, Text

from app.database import Base


class ErrorLog(Base):
    __tablename__ = "error_logs"
    __table_args__ = (Index("ix_errorlog_group_key", "group_key"),)

    id = Column(Integer, primary_key=True, index=True)
    group_key = Column(String(64), nullable=False, index=True)

    module = Column(String(40), nullable=False, index=True)
    sub_module = Column(String(40), nullable=True)
    function_name = Column(String(120), nullable=False)
    endpoint = Column(String(200), nullable=False)
    method = Column(String(10), nullable=False)

    error_code = Column(String(60), nullable=False)
    message = Column(String(500), nullable=False)
    severity = Column(String(10), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="ACTIVE", index=True)

    first_seen = Column(DateTime, default=datetime.utcnow, index=True)
    last_seen = Column(DateTime, default=datetime.utcnow, index=True)
    occurrence_count = Column(Integer, nullable=False, default=1)
    last_request_id = Column(String(40), nullable=True)  # None for errors not tied to an HTTP request (e.g. background email/WhatsApp sends)

    technical_details = Column(Text, nullable=True)
    request_metadata = Column(Text, nullable=True)
    recent_occurrences_json = Column(Text, nullable=True)

    resolved_by = Column(String(80), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_note = Column(String(300), nullable=True)


class FunctionStats(Base):
    __tablename__ = "function_stats"
    __table_args__ = (Index("ix_functionstats_key", "module", "function_name", "endpoint", "method", unique=True),)

    id = Column(Integer, primary_key=True, index=True)
    module = Column(String(40), nullable=False, index=True)
    sub_module = Column(String(40), nullable=True)
    function_name = Column(String(120), nullable=False)
    endpoint = Column(String(200), nullable=False)
    method = Column(String(10), nullable=False)

    success_count = Column(Integer, nullable=False, default=0)
    failure_count = Column(Integer, nullable=False, default=0)
    total_duration_ms = Column(Float, nullable=False, default=0.0)
    slow_count = Column(Integer, nullable=False, default=0)

    last_success_at = Column(DateTime, nullable=True)
    last_failure_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SystemLog(Base):
    __tablename__ = "system_logs"
    __table_args__ = (Index("ix_systemlog_created", "created_at"),)

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    level = Column(String(10), nullable=False, index=True)  # WARNING | ERROR | CRITICAL
    request_id = Column(String(40), nullable=True)
    module = Column(String(40), nullable=True, index=True)
    function_name = Column(String(120), nullable=True)
    endpoint = Column(String(200), nullable=True)
    method = Column(String(10), nullable=True)
    status_code = Column(Integer, nullable=True)
    execution_ms = Column(Float, nullable=True)
    error_code = Column(String(60), nullable=True)
    message = Column(String(500), nullable=False)
