"""In-process log hub: a bounded ring buffer (so a Developer opening the
page mid-job sees what already happened, section 16) plus live fan-out to
every connected WebSocket (section 2).

`emit()` must be safe to call from ANY thread -- most `logger.info(...)`
calls in this app happen inside synchronous route handlers, which FastAPI
runs in a worker thread, not the asyncio event loop thread. The ring-buffer
write is protected by a plain lock; broadcasting to subscriber queues is
handed to the event loop via `call_soon_threadsafe` since asyncio.Queue is
not itself thread-safe.

This is intentionally a single-process, in-memory design -- the smallest
reliable architecture for a single-instance SQLite app with no message
broker. It does not survive a server restart (nor should it: a restart is
exactly when watching "what the backend is doing right now" resets too).
"""
import asyncio
import itertools
import threading
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

RING_SIZE = 3000
SUBSCRIBER_QUEUE_SIZE = 1000


@dataclass
class LiveLogEntry:
    seq: int
    timestamp: str
    level: str
    message: str
    service: str = ""
    module: str = ""
    job_id: Optional[str] = None
    request_id: Optional[str] = None
    user: Optional[str] = None


class LogHub:
    def __init__(self, maxlen: int = RING_SIZE):
        self._buffer: deque[LiveLogEntry] = deque(maxlen=maxlen)
        self._lock = threading.Lock()
        self._seq_counter = itertools.count(1)
        self._subscribers: set[asyncio.Queue] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def emit(self, level: str, message: str, **fields) -> LiveLogEntry:
        entry = LiveLogEntry(
            seq=next(self._seq_counter),
            timestamp=datetime.utcnow().isoformat() + "Z",
            level=level,
            message=message,
            **fields,
        )
        with self._lock:
            self._buffer.append(entry)
        if self._loop is not None:
            try:
                self._loop.call_soon_threadsafe(self._broadcast, entry)
            except RuntimeError:
                pass  # loop already closed (e.g. shutting down) -- buffer write above still happened
        return entry

    def _broadcast(self, entry: LiveLogEntry) -> None:
        # Only ever runs on the event loop thread (via call_soon_threadsafe),
        # so mutating `_subscribers` here needs no extra lock.
        dead = []
        for queue in self._subscribers:
            try:
                queue.put_nowait(entry)
            except asyncio.QueueFull:
                # A slow/stalled client shouldn't back-pressure everyone else --
                # drop its oldest buffered entry and keep the stream moving.
                try:
                    queue.get_nowait()
                    queue.put_nowait(entry)
                except Exception:
                    dead.append(queue)
        for queue in dead:
            self._subscribers.discard(queue)

    def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=SUBSCRIBER_QUEUE_SIZE)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)

    def snapshot(self, since_seq: int = 0, job_id: Optional[str] = None, limit: int = 500) -> list[LiveLogEntry]:
        with self._lock:
            items = list(self._buffer)
        if job_id:
            items = [e for e in items if e.job_id == job_id]
        if since_seq:
            items = [e for e in items if e.seq > since_seq]
        return items[-limit:]

    def known_jobs(self, limit: int = 50) -> list[dict]:
        with self._lock:
            items = list(self._buffer)
        jobs: dict[str, dict] = {}
        for e in items:
            if not e.job_id:
                continue
            job = jobs.setdefault(
                e.job_id,
                {"job_id": e.job_id, "first_seen": e.timestamp, "service": e.service, "count": 0},
            )
            job["last_seen"] = e.timestamp
            job["last_level"] = e.level
            job["last_message"] = e.message
            job["count"] += 1
        return sorted(jobs.values(), key=lambda j: j["last_seen"], reverse=True)[:limit]


hub = LogHub()
