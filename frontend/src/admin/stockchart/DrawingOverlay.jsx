import { useState } from "react";
import {
  indexForX,
  plotRect,
  valueForY,
  xForIndex,
  yForValue,
} from "./chartGeometry";

const HIT_TOLERANCE_PX = 8;
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// Every multi-click tool's required point count -- drives when a drawing
// is finalized vs. still being placed. "brush" is handled separately via
// mousedown/mousemove/mouseup (a drag gesture, not discrete clicks).
const REQUIRED_POINTS = {
  trendline: 2, ray: 2, fibonacci: 2, rectangle: 2, circle: 2, arrow: 2, measure: 2,
  parallelchannel: 3,
  hline: 1, vline: 1, text: 1, pricelabel: 1,
};

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Turns a click's raw pixel position into a real data anchor -- point index
// (mapped back to that point's actual timestamp) + the price value at that
// pixel, optionally snapped to the nearest real O/H/L/C of that bar when
// Magnet is on. Anchors are always stored by timestamp/value, never by raw
// pixel, so they stay correctly attached to the data when the visible
// window (zoom) changes.
function anchorFromPixel(x, y, points, yDomain, rect, magnet) {
  const idx = indexForX(x, points.length, rect);
  const point = points[idx];
  if (!point) return { ts: undefined, value: valueForY(y, yDomain, rect) };
  let value = valueForY(y, yDomain, rect);
  if (magnet) {
    const candidates = [point.open, point.high, point.low, point.close];
    value = candidates.reduce((best, v) => (Math.abs(v - value) < Math.abs(best - value) ? v : best), candidates[0]);
  }
  return { ts: point.timestamp, value };
}

function pixelFromAnchor(anchor, points, yDomain, rect) {
  const idx = points.findIndex((p) => p.timestamp === anchor.ts);
  if (idx === -1) return null;
  return { x: xForIndex(idx, points.length, rect), y: yForValue(anchor.value, yDomain, rect) };
}

export default function DrawingOverlay({
  points,
  yDomain,
  containerSize,
  activeTool,
  drawings,
  onDrawingsChange,
  onCrosshairChange,
  magnet,
  locked,
  hidden,
}) {
  const [pendingPoints, setPendingPoints] = useState([]);
  const [liveMouse, setLiveMouse] = useState(null);
  const [brushPath, setBrushPath] = useState(null); // array of anchors while actively dragging

  const rect = plotRect(containerSize.width, containerSize.height);
  const isMultiClickTool = Object.prototype.hasOwnProperty.call(REQUIRED_POINTS, activeTool);
  const isInteractive = activeTool !== "cursor";

  function relativePos(e) {
    const bounds = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
  }

  function anchorAt(pos) {
    return anchorFromPixel(pos.x, pos.y, points, yDomain, rect, magnet);
  }

  function findDrawingNear(x, y) {
    for (const d of drawings) {
      if (d.type === "hline") {
        const py = yForValue(d.a.value, yDomain, rect);
        if (Math.abs(y - py) <= HIT_TOLERANCE_PX) return d.id;
      } else if (d.type === "vline") {
        const p = pixelFromAnchor(d.a, points, yDomain, rect);
        if (p && Math.abs(x - p.x) <= HIT_TOLERANCE_PX) return d.id;
      } else if (d.type === "text" || d.type === "pricelabel") {
        const p = pixelFromAnchor(d.a, points, yDomain, rect);
        if (p && Math.hypot(x - p.x, y - p.y) <= 16) return d.id;
      } else if (d.type === "brush") {
        const pts = d.path.map((a) => pixelFromAnchor(a, points, yDomain, rect)).filter(Boolean);
        for (let i = 1; i < pts.length; i++) {
          if (distToSegment(x, y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) <= HIT_TOLERANCE_PX) return d.id;
        }
      } else if (d.type === "rectangle" || d.type === "circle") {
        const pa = pixelFromAnchor(d.a, points, yDomain, rect);
        const pb = pixelFromAnchor(d.b, points, yDomain, rect);
        if (!pa || !pb) continue;
        const x1 = Math.min(pa.x, pb.x), x2 = Math.max(pa.x, pb.x);
        const y1 = Math.min(pa.y, pb.y), y2 = Math.max(pa.y, pb.y);
        const onEdge =
          (Math.abs(x - x1) <= HIT_TOLERANCE_PX || Math.abs(x - x2) <= HIT_TOLERANCE_PX) && y >= y1 - HIT_TOLERANCE_PX && y <= y2 + HIT_TOLERANCE_PX ||
          (Math.abs(y - y1) <= HIT_TOLERANCE_PX || Math.abs(y - y2) <= HIT_TOLERANCE_PX) && x >= x1 - HIT_TOLERANCE_PX && x <= x2 + HIT_TOLERANCE_PX;
        if (onEdge) return d.id;
      } else if (d.b) {
        // trendline, ray, arrow, fibonacci, measure -- all a straight a->b segment for hit-testing
        const pa = pixelFromAnchor(d.a, points, yDomain, rect);
        const pb = pixelFromAnchor(d.b, points, yDomain, rect);
        if (pa && pb && distToSegment(x, y, pa.x, pa.y, pb.x, pb.y) <= HIT_TOLERANCE_PX) return d.id;
      } else if (d.type === "parallelchannel") {
        const pa = pixelFromAnchor(d.a, points, yDomain, rect);
        const pb = pixelFromAnchor(d.b, points, yDomain, rect);
        if (pa && pb && distToSegment(x, y, pa.x, pa.y, pb.x, pb.y) <= HIT_TOLERANCE_PX) return d.id;
      }
    }
    return null;
  }

  function handleMouseMove(e) {
    const pos = relativePos(e);
    setLiveMouse(pos);
    if (activeTool === "crosshair" && onCrosshairChange) {
      const idx = indexForX(pos.x, points.length, rect);
      const point = points[idx];
      onCrosshairChange(point ? { x: pos.x, y: pos.y, point } : null);
    }
    if (brushPath) {
      setBrushPath((path) => [...path, anchorAt(pos)]);
    }
  }

  function handleMouseLeave() {
    setLiveMouse(null);
    if (onCrosshairChange) onCrosshairChange(null);
  }

  function handleMouseDown(e) {
    if (activeTool !== "brush") return;
    const pos = relativePos(e);
    setBrushPath([anchorAt(pos)]);
  }

  function handleMouseUp() {
    if (activeTool !== "brush" || !brushPath) return;
    if (brushPath.length > 1) {
      onDrawingsChange([...drawings, { id: crypto.randomUUID(), type: "brush", path: brushPath }]);
    }
    setBrushPath(null);
  }

  function handleClick(e) {
    if (activeTool === "brush") return; // handled via drag, not click
    const pos = relativePos(e);

    if (activeTool === "delete") {
      if (locked) return;
      const hitId = findDrawingNear(pos.x, pos.y);
      if (hitId) onDrawingsChange(drawings.filter((d) => d.id !== hitId));
      return;
    }

    if (activeTool === "hline") {
      const a = anchorAt(pos);
      onDrawingsChange([...drawings, { id: crypto.randomUUID(), type: "hline", a: { value: a.value } }]);
      return;
    }
    if (activeTool === "vline") {
      const a = anchorAt(pos);
      if (a.ts) onDrawingsChange([...drawings, { id: crypto.randomUUID(), type: "vline", a: { ts: a.ts } }]);
      return;
    }
    if (activeTool === "text") {
      const a = anchorAt(pos);
      if (!a.ts) return;
      const label = window.prompt("Annotation text:");
      if (label && label.trim()) {
        onDrawingsChange([...drawings, { id: crypto.randomUUID(), type: "text", a, label: label.trim() }]);
      }
      return;
    }
    if (activeTool === "pricelabel") {
      const a = anchorAt(pos);
      if (a.ts) onDrawingsChange([...drawings, { id: crypto.randomUUID(), type: "pricelabel", a }]);
      return;
    }

    if (isMultiClickTool) {
      const need = REQUIRED_POINTS[activeTool];
      const a = anchorAt(pos);
      if (!a.ts) return;
      const next = [...pendingPoints, a];
      if (next.length >= need) {
        onDrawingsChange([...drawings, { id: crypto.randomUUID(), type: activeTool, a: next[0], b: next[1], c: next[2] }]);
        setPendingPoints([]);
      } else {
        setPendingPoints(next);
      }
    }
  }

  // Reset any half-placed multi-click drawing when the tool changes away
  // from it -- a stale pending point must never silently attach to a
  // different tool the user switches to.
  if (!isMultiClickTool && pendingPoints.length) {
    setPendingPoints([]);
  }

  function renderPreviewLine() {
    if (!pendingPoints.length || !liveMouse) return null;
    const pa = pixelFromAnchor(pendingPoints[pendingPoints.length - 1], points, yDomain, rect);
    if (!pa) return null;
    return <line x1={pa.x} y1={pa.y} x2={liveMouse.x} y2={liveMouse.y} stroke="#58a6ff" strokeDasharray="4 3" strokeWidth={1.5} />;
  }

  function renderDrawing(d) {
    if (d.type === "hline") {
      const y = yForValue(d.a.value, yDomain, rect);
      return (
        <g key={d.id}>
          <line x1={rect.left} y1={y} x2={rect.left + rect.width} y2={y} stroke="#e3b341" strokeWidth={1.25} />
          <text x={rect.left + 4} y={y - 4} fontSize={10} fill="#e3b341">₹{Math.round(d.a.value).toLocaleString()}</text>
        </g>
      );
    }
    if (d.type === "vline") {
      const p = pixelFromAnchor(d.a, points, yDomain, rect);
      if (!p) return null;
      return <line key={d.id} x1={p.x} y1={rect.top} x2={p.x} y2={rect.top + rect.height} stroke="#e3b341" strokeWidth={1.25} />;
    }
    if (d.type === "text" || d.type === "pricelabel") {
      const p = pixelFromAnchor(d.a, points, yDomain, rect);
      if (!p) return null;
      return (
        <g key={d.id}>
          <circle cx={p.x} cy={p.y} r={3} fill="#e3b341" />
          <text x={p.x + 6} y={p.y - 6} fontSize={11} fill="#e6edf3">
            {d.type === "text" ? d.label : `₹${Math.round(d.a.value).toLocaleString()}`}
          </text>
        </g>
      );
    }
    if (d.type === "brush") {
      const pts = d.path.map((a) => pixelFromAnchor(a, points, yDomain, rect)).filter(Boolean);
      if (pts.length < 2) return null;
      return <polyline key={d.id} points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#a371f7" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />;
    }
    if (d.type === "trendline" || d.type === "ray") {
      const pa = pixelFromAnchor(d.a, points, yDomain, rect);
      const pb = pixelFromAnchor(d.b, points, yDomain, rect);
      if (!pa || !pb) return null;
      let end = pb;
      if (d.type === "ray") {
        // extend the A->B direction out to the right edge of the plot area
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        if (Math.abs(dx) > 0.01) {
          const t = (rect.left + rect.width - pa.x) / dx;
          end = { x: rect.left + rect.width, y: pa.y + dy * t };
        }
      }
      return <line key={d.id} x1={pa.x} y1={pa.y} x2={end.x} y2={end.y} stroke="#58a6ff" strokeWidth={1.75} />;
    }
    if (d.type === "arrow") {
      const pa = pixelFromAnchor(d.a, points, yDomain, rect);
      const pb = pixelFromAnchor(d.b, points, yDomain, rect);
      if (!pa || !pb) return null;
      const angle = Math.atan2(pb.y - pa.y, pb.x - pa.x);
      const headLen = 9;
      const h1 = { x: pb.x - headLen * Math.cos(angle - Math.PI / 7), y: pb.y - headLen * Math.sin(angle - Math.PI / 7) };
      const h2 = { x: pb.x - headLen * Math.cos(angle + Math.PI / 7), y: pb.y - headLen * Math.sin(angle + Math.PI / 7) };
      return (
        <g key={d.id}>
          <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#58a6ff" strokeWidth={1.75} />
          <polyline points={`${h1.x},${h1.y} ${pb.x},${pb.y} ${h2.x},${h2.y}`} fill="none" stroke="#58a6ff" strokeWidth={1.75} strokeLinejoin="round" />
        </g>
      );
    }
    if (d.type === "rectangle" || d.type === "circle") {
      const pa = pixelFromAnchor(d.a, points, yDomain, rect);
      const pb = pixelFromAnchor(d.b, points, yDomain, rect);
      if (!pa || !pb) return null;
      const x = Math.min(pa.x, pb.x);
      const y = Math.min(pa.y, pb.y);
      const w = Math.abs(pb.x - pa.x);
      const h = Math.abs(pb.y - pa.y);
      if (d.type === "rectangle") {
        return <rect key={d.id} x={x} y={y} width={w} height={h} fill="#58a6ff22" stroke="#58a6ff" strokeWidth={1.25} />;
      }
      return <ellipse key={d.id} cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill="#58a6ff22" stroke="#58a6ff" strokeWidth={1.25} />;
    }
    if (d.type === "fibonacci") {
      const pa = pixelFromAnchor(d.a, points, yDomain, rect);
      const pb = pixelFromAnchor(d.b, points, yDomain, rect);
      if (!pa || !pb) return null;
      const x1 = Math.min(pa.x, pb.x);
      const x2 = Math.max(pa.x, pb.x);
      return (
        <g key={d.id}>
          {FIB_LEVELS.map((lvl) => {
            const value = d.a.value + (d.b.value - d.a.value) * lvl;
            const y = yForValue(value, yDomain, rect);
            return (
              <g key={lvl}>
                <line x1={x1} y1={y} x2={x2} y2={y} stroke="#e3b341" strokeWidth={1} strokeDasharray={lvl === 0 || lvl === 1 ? "0" : "3 3"} />
                <text x={x2 + 4} y={y + 3} fontSize={9} fill="#e3b341">{(lvl * 100).toFixed(1)}% ₹{Math.round(value).toLocaleString()}</text>
              </g>
            );
          })}
        </g>
      );
    }
    if (d.type === "parallelchannel") {
      const pa = pixelFromAnchor(d.a, points, yDomain, rect);
      const pb = pixelFromAnchor(d.b, points, yDomain, rect);
      const pc = d.c ? pixelFromAnchor(d.c, points, yDomain, rect) : null;
      if (!pa || !pb) return null;
      const offsetY = pc ? pc.y - pa.y : 0;
      return (
        <g key={d.id}>
          <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#58a6ff" strokeWidth={1.5} />
          <line x1={pa.x} y1={pa.y + offsetY} x2={pb.x} y2={pb.y + offsetY} stroke="#58a6ff" strokeWidth={1.5} strokeDasharray="4 3" />
        </g>
      );
    }
    if (d.type === "measure") {
      const pa = pixelFromAnchor(d.a, points, yDomain, rect);
      const pb = pixelFromAnchor(d.b, points, yDomain, rect);
      if (!pa || !pb) return null;
      const change = d.b.value - d.a.value;
      const pct = d.a.value ? (change / d.a.value) * 100 : 0;
      const idxA = points.findIndex((p) => p.timestamp === d.a.ts);
      const idxB = points.findIndex((p) => p.timestamp === d.b.ts);
      const bars = Math.abs(idxB - idxA);
      const midX = (pa.x + pb.x) / 2;
      const midY = (pa.y + pb.y) / 2;
      return (
        <g key={d.id}>
          <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#a371f7" strokeWidth={1.5} strokeDasharray="2 2" />
          <rect x={midX - 55} y={midY - 24} width={110} height={40} fill="#161b22" stroke="#30363d" rx={4} />
          <text x={midX} y={midY - 10} fontSize={10} fill={change >= 0 ? "#26a69a" : "#ef5350"} textAnchor="middle">
            {change >= 0 ? "+" : ""}₹{Math.round(change).toLocaleString()} ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
          </text>
          <text x={midX} y={midY + 4} fontSize={10} fill="#8b949e" textAnchor="middle">{bars} bar{bars === 1 ? "" : "s"}</text>
        </g>
      );
    }
    return null;
  }

  return (
    <svg
      width={containerSize.width}
      height={containerSize.height}
      style={{
        position: "absolute", inset: 0,
        cursor: activeTool === "cursor" ? "default" : activeTool === "delete" ? "not-allowed" : "crosshair",
        pointerEvents: isInteractive ? "auto" : "none",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {activeTool === "crosshair" && liveMouse && (
        <>
          <line x1={liveMouse.x} y1={rect.top} x2={liveMouse.x} y2={rect.top + rect.height} stroke="#8b949e" strokeDasharray="3 3" strokeWidth={1} />
          <line x1={rect.left} y1={liveMouse.y} x2={rect.left + rect.width} y2={liveMouse.y} stroke="#8b949e" strokeDasharray="3 3" strokeWidth={1} />
        </>
      )}

      {renderPreviewLine()}

      {brushPath && brushPath.length > 1 && (
        <polyline
          points={brushPath.map((a) => pixelFromAnchor(a, points, yDomain, rect)).filter(Boolean).map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none" stroke="#a371f7" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round"
        />
      )}

      {!hidden && drawings.map(renderDrawing)}
    </svg>
  );
}
