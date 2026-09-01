// Severity/status pill helpers shared by the System Health pages. The design
// system only has 4 semantic badge tones (accent/gold/muted/danger -- see
// index.css), so the 5 conceptual severities are mapped onto those same 4,
// with emoji + weight carrying the extra distinction rather than inventing
// new colors.

const SEVERITY_CLASS = {
  CRITICAL: "badge-danger",
  HIGH: "badge-danger",
  MEDIUM: "badge-gold",
  WARNING: "badge-gold",
  INFO: "badge-muted",
};

const SEVERITY_EMOJI = {
  CRITICAL: "⚠️",
  HIGH: "🔴",
  MEDIUM: "🟠",
  WARNING: "🟡",
  INFO: "⚪",
};

export function SeverityBadge({ severity }) {
  return (
    <span
      className={`badge ${SEVERITY_CLASS[severity] || "badge-muted"}`}
      style={severity === "CRITICAL" ? { fontWeight: 800 } : undefined}
    >
      {SEVERITY_EMOJI[severity] || ""} {severity}
    </span>
  );
}

const STATUS_CLASS = {
  ACTIVE: "badge-danger",
  INVESTIGATING: "badge-gold",
  RESOLVED: "badge-accent",
  IGNORED: "badge-muted",
};

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_CLASS[status] || "badge-muted"}`}>{status}</span>;
}

const LOG_LEVEL_CLASS = {
  CRITICAL: "badge-danger",
  ERROR: "badge-danger",
  WARNING: "badge-gold",
  INFO: "badge-muted",
};

export function LogLevelBadge({ level }) {
  return <span className={`badge ${LOG_LEVEL_CLASS[level] || "badge-muted"}`}>{level}</span>;
}
