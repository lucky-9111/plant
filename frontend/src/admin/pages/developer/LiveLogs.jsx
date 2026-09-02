import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../api";

const LEVELS = ["ALL", "DEBUG", "INFO", "SUCCESS", "WARNING", "ERROR", "CRITICAL"];
const LEVEL_COLOR = {
  DEBUG: "#8b9a91",
  INFO: "#7fd1ff",
  SUCCESS: "#5fe0a0",
  WARNING: "#e8c15c",
  ERROR: "#ff6b6b",
  CRITICAL: "#ff4d4d",
};
const MAX_ENTRIES = 5000; // ring buffer on the client too -- never grow unbounded (section 18)
const RENDER_LIMIT = 1500; // don't mount more DOM rows than a human can usefully scroll through
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 15000]; // capped exponential backoff

function wsUrl(path) {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}

export default function LiveLogs() {
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("connecting"); // connecting | live | disconnected | reconnecting
  const [level, setLevel] = useState("ALL");
  const [service, setService] = useState("ALL");
  const [jobId, setJobId] = useState("");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const [jobs, setJobs] = useState([]);

  const wsRef = useRef(null);
  const lastSeqRef = useRef(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const closedByUsRef = useRef(false);
  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  const connect = useCallback(() => {
    closedByUsRef.current = false;
    setStatus((s) => (s === "disconnected" ? "reconnecting" : "connecting"));

    const params = new URLSearchParams({ since: String(lastSeqRef.current) });
    if (jobId) params.set("job_id", jobId);
    const ws = new WebSocket(wsUrl(`/api/developer/live-logs/ws?${params}`));
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setStatus("live");
    };

    ws.onmessage = (event) => {
      const entry = JSON.parse(event.data);
      lastSeqRef.current = Math.max(lastSeqRef.current, entry.seq);
      setEntries((prev) => {
        const next = prev.length >= MAX_ENTRIES ? prev.slice(prev.length - MAX_ENTRIES + 1) : prev.slice();
        next.push(entry);
        return next;
      });
    };

    ws.onclose = () => {
      if (closedByUsRef.current) return;
      setStatus("reconnecting");
      const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    connect();
    return () => {
      closedByUsRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    let cancelled = false;
    function loadJobs() {
      api.get("/developer/live-logs/jobs").then((data) => {
        if (!cancelled) setJobs(data);
      }).catch(() => {});
    }
    loadJobs();
    const interval = setInterval(loadJobs, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const services = useMemo(() => {
    const set = new Set();
    for (const e of entries) if (e.service) set.add(e.service);
    return ["ALL", ...Array.from(set).sort()];
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (level !== "ALL" && e.level !== level) return false;
      if (service !== "ALL" && e.service !== service) return false;
      if (!q) return true;
      return (
        e.message?.toLowerCase().includes(q) ||
        e.job_id?.toLowerCase().includes(q) ||
        e.request_id?.toLowerCase().includes(q) ||
        e.service?.toLowerCase().includes(q) ||
        e.module?.toLowerCase().includes(q)
      );
    });
  }, [entries, level, service, search]);

  const visible = useMemo(
    () => (filtered.length > RENDER_LIMIT ? filtered.slice(filtered.length - RENDER_LIMIT) : filtered),
    [filtered]
  );

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ block: "end" });
      setHasNew(false);
    } else if (entries.length > 0) {
      setHasNew(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  }

  function jumpToLatest() {
    setAutoScroll(true);
    bottomRef.current?.scrollIntoView({ block: "end" });
    setHasNew(false);
  }

  function clearView() {
    setEntries([]);
    setHasNew(false);
  }

  function formatLine(e) {
    const time = e.timestamp?.slice(11, 19) || "";
    const level = (e.level || "").padEnd(8);
    return `${time}  ${level}  ${e.message}`;
  }

  async function copyVisible() {
    const text = visible.map(formatLine).join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard permission denied -- nothing else we can do silently
    }
  }

  function downloadVisible() {
    const text = visible.map(formatLine).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const activeJob = jobs.find((j) => j.job_id === jobId);

  return (
    <div>
      <div className="admin-page-head">
        <h1>Live Logs</h1>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <StatusPill status={status} />
        <input
          type="text"
          className="form-control"
          style={{ maxWidth: 260 }}
          placeholder="Search logs, job ID, request ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-control" style={{ maxWidth: 150 }} value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select className="form-control" style={{ maxWidth: 180 }} value={service} onChange={(e) => setService(e.target.value)}>
          {services.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="form-control"
          style={{ maxWidth: 220 }}
          value={jobId}
          onChange={(e) => {
            // Switching which job to watch means re-fetching its full
            // buffered history from the hub, not just continuing where the
            // "all jobs" stream left off.
            lastSeqRef.current = 0;
            setEntries([]);
            setJobId(e.target.value);
          }}
        >
          <option value="">All jobs</option>
          {jobs.map((j) => (
            <option key={j.job_id} value={j.job_id}>{j.job_id}</option>
          ))}
        </select>
        <button className="btn btn-sm btn-outline dark" onClick={clearView}>Clear View</button>
        <button className="btn btn-sm btn-outline dark" onClick={copyVisible}>Copy</button>
        <button className="btn btn-sm btn-outline dark" onClick={downloadVisible}>Download</button>
      </div>

      {activeJob && (
        <div className="admin-form-card" style={{ marginBottom: 12, padding: "12px 16px" }}>
          <strong>{activeJob.job_id}</strong>
          <span style={{ marginLeft: 12, color: "var(--color-text-muted)" }}>
            {activeJob.count} log line{activeJob.count === 1 ? "" : "s"} · last: {activeJob.last_level} — {activeJob.last_message}
          </span>
        </div>
      )}

      <div style={{ position: "relative" }}>
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{
            background: "#0d1117",
            color: "#c9d1d9",
            borderRadius: 10,
            padding: "12px 16px",
            height: "60vh",
            overflowY: "auto",
            fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
            fontSize: "0.82rem",
            lineHeight: 1.6,
          }}
        >
          {visible.length === 0 ? (
            <div style={{ color: "#6e7681" }}>Waiting for log activity...</div>
          ) : (
            visible.map((e) => (
              <div key={e.seq} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                <span style={{ color: "#6e7681" }}>{e.timestamp?.slice(11, 19)}</span>{"  "}
                <span style={{ color: LEVEL_COLOR[e.level] || "#c9d1d9", fontWeight: 700 }}>
                  {(e.level || "").padEnd(8)}
                </span>{"  "}
                <span>{e.message}</span>
                {(e.job_id || e.request_id) && (
                  <span style={{ color: "#6e7681" }}>
                    {"  "}
                    {e.job_id && `[${e.job_id}]`}
                    {e.request_id && ` [${e.request_id}]`}
                  </span>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {hasNew && !autoScroll && (
          <button
            onClick={jumpToLatest}
            className="btn btn-sm btn-primary"
            style={{ position: "absolute", bottom: 16, right: 16 }}
          >
            ↓ New logs
          </button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    live: { dot: "●", text: "LIVE", color: "#2f9e5b" },
    connecting: { dot: "◌", text: "CONNECTING...", color: "#c98a3e" },
    reconnecting: { dot: "◌", text: "RECONNECTING...", color: "#c98a3e" },
    disconnected: { dot: "○", text: "DISCONNECTED", color: "#c1443c" },
  };
  const s = map[status] || map.disconnected;
  return (
    <span style={{ fontWeight: 700, color: s.color, fontSize: "0.85rem", letterSpacing: "0.03em" }}>
      {s.dot} {s.text}
    </span>
  );
}
