// Shared recharts <Tooltip content={...}> renderer, styled with the existing
// design tokens instead of recharts' default tooltip look.
export default function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow)",
        padding: "10px 14px",
        fontSize: "0.85rem",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--color-text)" }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color || "var(--color-text-muted)" }}>
          {formatter ? formatter(entry) : `${entry.name}: ${entry.value}`}
        </div>
      ))}
    </div>
  );
}
