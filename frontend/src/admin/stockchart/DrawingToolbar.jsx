const TOOLS = [
  { id: "cursor", icon: "⭠", title: "Cursor" },
  { id: "crosshair", icon: "✛", title: "Crosshair" },
  { id: "trendline", icon: "╱", title: "Trend Line" },
  { id: "ray", icon: "↗", title: "Ray" },
  { id: "parallelchannel", icon: "≡", title: "Parallel Channel (3 clicks)" },
  { id: "hline", icon: "—", title: "Horizontal Line" },
  { id: "vline", icon: "│", title: "Vertical Line" },
  { id: "fibonacci", icon: "F", title: "Fibonacci Retracement" },
  { id: "rectangle", icon: "▭", title: "Rectangle" },
  { id: "circle", icon: "○", title: "Circle" },
  { id: "arrow", icon: "↑", title: "Arrow" },
  { id: "brush", icon: "✎", title: "Brush (click + drag)" },
  { id: "text", icon: "T", title: "Text" },
  { id: "pricelabel", icon: "🏷", title: "Price Label" },
  { id: "measure", icon: "📏", title: "Measure" },
  { id: "delete", icon: "🗑", title: "Delete (click a drawing)" },
];

function IconButton({ active, disabled, title, onClick, children }) {
  return (
    <button
      type="button"
      className={`stc-btn ${active ? "stc-active" : ""}`}
      style={{ width: 26, height: 26, padding: 0, justifyContent: "center", flexShrink: 0, fontSize: "0.72rem" }}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, width: 20, background: "#21262d", margin: "4px 0", flexShrink: 0 }} />;
}

export default function DrawingToolbar({
  activeTool, onToolChange, onUndo, onRedo, canUndo, canRedo,
  onClearDrawings, onZoomIn, onZoomOut, onZoomReset,
  magnet, onToggleMagnet, locked, onToggleLocked, hidden, onToggleHidden,
}) {
  return (
    <div
      className="stc-drawing-toolbar"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
        padding: "6px 3px", background: "#131722", borderRight: "1px solid #21262d",
        width: 34, flexShrink: 0, overflowY: "auto", overflowX: "hidden",
      }}
    >
      {TOOLS.map((t) => (
        <IconButton key={t.id} active={activeTool === t.id} title={t.title} onClick={() => onToolChange(t.id)}>
          {t.icon}
        </IconButton>
      ))}

      <Divider />

      <IconButton active={magnet} title="Magnet -- snap to O/H/L/C" onClick={onToggleMagnet}>🧲</IconButton>
      <IconButton active={locked} title="Lock Drawings" onClick={onToggleLocked}>🔒</IconButton>
      <IconButton active={hidden} title="Hide Drawings" onClick={onToggleHidden}>{hidden ? "🙈" : "👁"}</IconButton>

      <Divider />

      <IconButton title="Zoom In" onClick={onZoomIn}>+</IconButton>
      <IconButton title="Zoom Out" onClick={onZoomOut}>−</IconButton>
      <IconButton title="Reset Zoom" onClick={onZoomReset}>⤢</IconButton>

      <Divider />

      <IconButton title="Undo" disabled={!canUndo} onClick={onUndo}>↶</IconButton>
      <IconButton title="Redo" disabled={!canRedo} onClick={onRedo}>↷</IconButton>
      <IconButton title="Clear All Drawings" onClick={onClearDrawings}>✕</IconButton>
    </div>
  );
}
