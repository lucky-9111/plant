import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Line,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../api";
import { Loading, Empty } from "../../components/Loading";
import DrawingOverlay from "../stockchart/DrawingOverlay";
import DrawingToolbar from "../stockchart/DrawingToolbar";
import IndicatorsMenu from "../stockchart/IndicatorsMenu";
import ResizeHandle from "../stockchart/ResizeHandle";
import Watchlist from "../stockchart/Watchlist";
import { Y_AXIS_WIDTH, computeYDomain } from "../stockchart/chartGeometry";
import { bollingerBands, ema, macd, rsi, sma, INDICATOR_COLORS } from "../stockchart/indicators";
import "../../styles/stock-chart.css";

// Phase 1: dark full-screen terminal shell, real candlesticks (custom-built
// on the existing `recharts` dependency), compact toolbar, OHLC title line,
// bottom timeframe bar.
// Phase 2 (this pass): left drawing toolbar -- Cursor/Crosshair/Trend Line/
// Horizontal Line/Vertical Line/Measure/Delete, undo/redo, a real (if
// simple, discrete) zoom, all backed by a custom SVG overlay whose pixel
// math is defined once in stockchart/chartGeometry.js and reused by both
// the overlay and the chart's own axis settings below, so they can't drift
// apart independently.

const TIMEFRAMES = ["1D", "5D", "1W", "1M", "3M", "6M", "YTD", "1Y", "5Y", "ALL"];
const CHART_TYPES = ["Candles", "Bars", "Line", "Area"];
const INSTRUMENTS = [
  { value: "total", label: "Total Sales" },
  { value: "online", label: "Online Sales" },
  { value: "offline", label: "Offline Sales" },
  { value: "category", label: "By Category" },
  { value: "product", label: "By Product" },
];
const MIN_ZOOM_POINTS = 5;

const UP_COLOR = "#26a69a";
const DOWN_COLOR = "#ef5350";

function fmtDate(key) {
  const d = new Date(key);
  if (Number.isNaN(d.getTime())) return key;
  return key.length > 10
    ? d.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function CandleTooltip({ active, payload, volumeType }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const up = p.close >= p.open;
  return (
    <div
      style={{
        background: "#161b22", border: "1px solid #30363d", borderRadius: 6,
        padding: "8px 12px", fontSize: "0.76rem", color: "#c9d1d9",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{fmtDate(p.timestamp)}</div>
      <div>Open <b>₹{p.open.toLocaleString()}</b></div>
      <div>High <b>₹{p.high.toLocaleString()}</b></div>
      <div>Low <b>₹{p.low.toLocaleString()}</b></div>
      <div className={up ? "stc-up" : "stc-down"}>Close <b>₹{p.close.toLocaleString()}</b></div>
      <div style={{ marginTop: 4, color: "#8b949e" }}>
        {volumeType === "orders" ? "Orders" : "Units"}: {p.volume.toLocaleString()}
      </div>
    </div>
  );
}

// RSI/MACD panel rows only have {timestamp, ind_*} fields, not OHLC --
// CandleTooltip above would throw on p.open being undefined, so indicator
// panels use this simpler, defensive tooltip instead.
function IndicatorTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "#161b22", border: "1px solid #30363d", borderRadius: 6,
        padding: "8px 12px", fontSize: "0.76rem", color: "#c9d1d9",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{fmtDate(label)}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.stroke || entry.fill || "#c9d1d9" }}>
          {entry.value == null ? "—" : Number(entry.value).toFixed(2)}
        </div>
      ))}
    </div>
  );
}

export default function StockChart() {
  const [instrument, setInstrument] = useState("total");
  const [categoryId, setCategoryId] = useState("");
  const [plantId, setPlantId] = useState("");
  // 1D defaults to empty far too often at this business's real order volume
  // (a rolling 24h window can easily fall between two real orders) -- 1M
  // reliably has real data to show on first load. 1D itself is untouched
  // and still correctly shows "No Data Available" when it genuinely is.
  const [timeframe, setTimeframe] = useState("1M");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [volumeType, setVolumeType] = useState("orders");
  const [chartType, setChartType] = useState("Candles");

  const [filters, setFilters] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const rootRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Phase 2: drawing tools + zoom
  const [activeTool, setActiveTool] = useState("cursor");
  const [magnet, setMagnet] = useState(false);
  const [locked, setLocked] = useState(false);
  const [drawingsHidden, setDrawingsHidden] = useState(false);
  const [drawings, setDrawings] = useState([]);
  const [history, setHistory] = useState([]); // past `drawings` snapshots, for Undo
  const [future, setFuture] = useState([]); // undone snapshots, for Redo
  const [zoomWindow, setZoomWindow] = useState(null); // [startIdx, endIdx) or null = full range
  const [crosshairInfo, setCrosshairInfo] = useState(null);
  // A plain useRef(null) here would only ever be checked once, in an
  // effect with `[]` deps that runs on mount -- but this div is behind a
  // loading conditional, so on mount it doesn't exist yet, the effect sees
  // null and bails out, and (since it never re-runs) the ResizeObserver
  // never gets attached even once the chart actually renders. A callback
  // ref re-fires every time the node is attached/detached, so it correctly
  // catches the moment the real element appears.
  const [chartAreaEl, setChartAreaEl] = useState(null);
  const chartAreaRef = useCallback((node) => setChartAreaEl(node), []);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Phase 4: indicators + resizable panels
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [showIndicatorsMenu, setShowIndicatorsMenu] = useState(false);
  const [panelHeights, setPanelHeights] = useState({ volume: 90, rsi: 110, macd: 110 });
  const [watchlistCollapsed, setWatchlistCollapsed] = useState(false);

  useEffect(() => {
    api.get("/admin/stock-chart/filters").then(setFilters).catch(() => setFilters({ categories: [], plants: [] }));
  }, []);

  useEffect(() => {
    if (timeframe === "CUSTOM" && (!customFrom || !customTo)) return;
    setData(null);
    setError("");
    const apiTimeframe = timeframe === "YTD" ? "1Y" : timeframe === "5Y" ? "3Y" : timeframe; // backend doesn't have YTD/5Y buckets yet -- nearest supported range, not fabricated
    const params = new URLSearchParams({ instrument, timeframe: apiTimeframe, volume_type: volumeType });
    if (instrument === "category" && categoryId) params.set("category_id", categoryId);
    if (instrument === "product" && plantId) params.set("plant_id", plantId);
    if (timeframe === "CUSTOM") {
      params.set("date_from", new Date(customFrom).toISOString());
      params.set("date_to", new Date(customTo).toISOString());
    }
    api
      .get(`/admin/stock-chart?${params.toString()}`)
      .then((result) => {
        setData(result);
        setZoomWindow(null); // a fresh data load resets any prior zoom
      })
      .catch((err) => setError(err.message || "Could not load Stock Chart data."));
  }, [instrument, categoryId, plantId, timeframe, customFrom, customTo, volumeType]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!chartAreaEl) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setContainerSize({ width: box.width, height: box.height });
    });
    observer.observe(chartAreaEl);
    setContainerSize({ width: chartAreaEl.clientWidth, height: chartAreaEl.clientHeight });
    return () => observer.disconnect();
  }, [chartAreaEl]);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      rootRef.current?.requestFullscreen?.().catch(() => {});
    }
  }

  const allPoints = useMemo(() => {
    if (!data?.points) return [];
    return data.points.map((p) => ({
      ...p,
      wickRange: [p.low, p.high],
      bodyRange: [Math.min(p.open, p.close), Math.max(p.open, p.close)],
    }));
  }, [data]);

  const points = useMemo(() => {
    if (!zoomWindow) return allPoints;
    return allPoints.slice(zoomWindow[0], zoomWindow[1]);
  }, [allPoints, zoomWindow]);

  const yDomain = useMemo(() => computeYDomain(points), [points]);

  // Phase 4: indicator series -- all computed client-side from the chart's
  // own real `close` values (see stockchart/indicators.js), never fabricated.
  const overlayIndicators = useMemo(() => activeIndicators.filter((i) => ["SMA", "EMA", "BB"].includes(i.type)), [activeIndicators]);
  const rsiIndicators = useMemo(() => activeIndicators.filter((i) => i.type === "RSI"), [activeIndicators]);
  const macdIndicators = useMemo(() => activeIndicators.filter((i) => i.type === "MACD"), [activeIndicators]);

  const chartData = useMemo(() => {
    if (!overlayIndicators.length) return points;
    const closes = points.map((p) => p.close);
    let enriched = points;
    for (const ind of overlayIndicators) {
      if (ind.type === "SMA") {
        const vals = sma(closes, ind.params.period);
        enriched = enriched.map((p, i) => ({ ...p, [`ind_${ind.id}`]: vals[i] }));
      } else if (ind.type === "EMA") {
        const vals = ema(closes, ind.params.period);
        enriched = enriched.map((p, i) => ({ ...p, [`ind_${ind.id}`]: vals[i] }));
      } else if (ind.type === "BB") {
        const { upper, middle, lower } = bollingerBands(closes, ind.params.period, ind.params.deviations);
        enriched = enriched.map((p, i) => ({
          ...p, [`ind_${ind.id}_upper`]: upper[i], [`ind_${ind.id}_middle`]: middle[i], [`ind_${ind.id}_lower`]: lower[i],
        }));
      }
    }
    return enriched;
  }, [points, overlayIndicators]);

  const rsiData = useMemo(() => {
    if (!rsiIndicators.length) return [];
    const closes = points.map((p) => p.close);
    const series = rsiIndicators.map((ind) => ({ id: ind.id, values: rsi(closes, ind.params.period) }));
    return points.map((p, i) => {
      const row = { timestamp: p.timestamp };
      for (const s of series) row[`ind_${s.id}`] = s.values[i];
      return row;
    });
  }, [points, rsiIndicators]);

  const macdData = useMemo(() => {
    if (!macdIndicators.length) return [];
    const closes = points.map((p) => p.close);
    const series = macdIndicators.map((ind) => ({
      id: ind.id,
      ...macd(closes, ind.params.fast, ind.params.slow, ind.params.signal),
    }));
    return points.map((p, i) => {
      const row = { timestamp: p.timestamp };
      for (const s of series) {
        row[`ind_${s.id}_macd`] = s.macdLine[i];
        row[`ind_${s.id}_signal`] = s.signalLine[i];
        row[`ind_${s.id}_hist`] = s.histogram[i];
      }
      return row;
    });
  }, [points, macdIndicators]);

  function addIndicator(ind) {
    setActiveIndicators((prev) => [...prev, ind]);
  }

  function removeIndicator(id) {
    setActiveIndicators((prev) => prev.filter((i) => i.id !== id));
  }

  function updateIndicatorParam(id, key, value) {
    setActiveIndicators((prev) => prev.map((i) => (i.id === id ? { ...i, params: { ...i.params, [key]: value } } : i)));
  }

  function resizePanel(key, delta, min = 60, max = 320) {
    setPanelHeights((prev) => ({ ...prev, [key]: Math.min(max, Math.max(min, prev[key] - delta)) }));
  }

  function handleWatchlistSelect(selection) {
    if (selection.kind === "core") {
      setInstrument(selection.instrument);
      setCategoryId("");
      setPlantId("");
    } else if (selection.kind === "plant") {
      setInstrument("product");
      setPlantId(String(selection.plantId));
      setCategoryId("");
    }
  }

  const watchlistSelection =
    instrument === "product" && plantId
      ? { kind: "plant", plantId }
      : instrument !== "category" && instrument !== "product"
      ? { kind: "core", instrument }
      : null;

  function renderOverlayLines(indicators) {
    return indicators.flatMap((ind, i) => {
      const color = INDICATOR_COLORS[i % INDICATOR_COLORS.length];
      if (ind.type === "BB") {
        return [
          <Line key={`${ind.id}_upper`} type="monotone" dataKey={`ind_${ind.id}_upper`} stroke={color} strokeWidth={1} dot={false} isAnimationActive={false} connectNulls />,
          <Line key={`${ind.id}_middle`} type="monotone" dataKey={`ind_${ind.id}_middle`} stroke={color} strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} connectNulls />,
          <Line key={`${ind.id}_lower`} type="monotone" dataKey={`ind_${ind.id}_lower`} stroke={color} strokeWidth={1} dot={false} isAnimationActive={false} connectNulls />,
        ];
      }
      return [<Line key={ind.id} type="monotone" dataKey={`ind_${ind.id}`} stroke={color} strokeWidth={1.25} dot={false} isAnimationActive={false} connectNulls />];
    });
  }

  function pushDrawings(next) {
    setHistory((h) => [...h, drawings]);
    setFuture([]);
    setDrawings(next);
  }

  function handleUndo() {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [drawings, ...f]);
    setDrawings(prev);
  }

  function handleRedo() {
    if (!future.length) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, drawings]);
    setDrawings(next);
  }

  function handleClearDrawings() {
    if (!drawings.length) return;
    pushDrawings([]);
  }

  function handleZoomIn() {
    const [start, end] = zoomWindow || [0, allPoints.length];
    const span = end - start;
    const newSpan = Math.max(MIN_ZOOM_POINTS, Math.round(span * 0.7));
    if (newSpan >= span) return;
    const mid = (start + end) / 2;
    setZoomWindow([Math.max(0, Math.round(mid - newSpan / 2)), Math.min(allPoints.length, Math.round(mid + newSpan / 2))]);
  }

  function handleZoomOut() {
    const [start, end] = zoomWindow || [0, allPoints.length];
    const span = end - start;
    const newSpan = Math.min(allPoints.length, Math.round(span / 0.7));
    const mid = (start + end) / 2;
    const newStart = Math.max(0, Math.round(mid - newSpan / 2));
    const newEnd = Math.min(allPoints.length, newStart + newSpan);
    if (newStart === 0 && newEnd === allPoints.length) {
      setZoomWindow(null);
    } else {
      setZoomWindow([newStart, newEnd]);
    }
  }

  function handleZoomReset() {
    setZoomWindow(null);
  }

  // Real trackpad/mouse-wheel zoom, anchored to the cursor's X position (not
  // just the window's center) so the point under the mouse stays roughly put
  // -- matches the TradingView-style "scroll to zoom" interaction the user
  // asked for, as a continuous alternative to the discrete +/- buttons.
  const panState = useRef(null);
  function handleWheelZoom(e) {
    e.preventDefault();
    const [start, end] = zoomWindow || [0, allPoints.length];
    const span = end - start;
    const rect = e.currentTarget.getBoundingClientRect();
    const usableWidth = Math.max(1, rect.width - Y_AXIS_WIDTH);
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / usableWidth));
    const anchorIdx = start + frac * span;
    const zoomIn = e.deltaY < 0;
    const factor = zoomIn ? 0.85 : 1 / 0.85;
    let newSpan = Math.round(span * factor);
    newSpan = Math.max(MIN_ZOOM_POINTS, Math.min(allPoints.length, newSpan));
    if (newSpan === span) return;
    let newStart = Math.round(anchorIdx - frac * newSpan);
    newStart = Math.max(0, Math.min(allPoints.length - newSpan, newStart));
    const newEnd = newStart + newSpan;
    if (newStart === 0 && newEnd === allPoints.length) {
      setZoomWindow(null);
    } else {
      setZoomWindow([newStart, newEnd]);
    }
  }

  // Click-and-drag panning, active only in "cursor" mode (drawing tools own
  // the drag gesture otherwise). Converts pixel movement to an index shift
  // using the same points-per-pixel ratio as the current zoom window.
  function handlePanStart(e) {
    if (activeTool !== "cursor" || e.button !== 0) return;
    const [start, end] = zoomWindow || [0, allPoints.length];
    const rect = e.currentTarget.getBoundingClientRect();
    panState.current = { startX: e.clientX, start, end, rect };
  }
  function handlePanMove(e) {
    if (!panState.current) return;
    const { startX, start, end, rect } = panState.current;
    const span = end - start;
    const usableWidth = Math.max(1, rect.width - Y_AXIS_WIDTH);
    const dxIdx = ((startX - e.clientX) / usableWidth) * span;
    let newStart = Math.round(start + dxIdx);
    newStart = Math.max(0, Math.min(allPoints.length - span, newStart));
    const newEnd = newStart + span;
    setZoomWindow(newStart === 0 && newEnd === allPoints.length ? null : [newStart, newEnd]);
  }
  function handlePanEnd() {
    panState.current = null;
  }

  const onDrawingsChange = useCallback((next) => pushDrawings(next), [drawings]);

  const last = points[points.length - 1];
  const symbolLabel =
    instrument === "category"
      ? filters?.categories?.find((c) => String(c.id) === String(categoryId))?.name || "Category"
      : instrument === "product"
      ? filters?.plants?.find((p) => String(p.id) === String(plantId))?.name || "Product"
      : INSTRUMENTS.find((i) => i.value === instrument)?.label || "Total Sales";

  const chartMargin = { top: 8, right: 0, left: 0, bottom: 0 };

  return (
    <div className="stc-root" ref={rootRef}>
      {/* ---------- Top toolbar ---------- */}
      <div className="stc-toolbar">
        <Link to="/admin" className="stc-btn" title="Back to Admin">☰</Link>
        <span className="stc-brand">Aaiji Nursery</span>

        <div className="stc-toolbar-group">
          <select className="stc-select" value={instrument} onChange={(e) => setInstrument(e.target.value)}>
            {INSTRUMENTS.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
          {instrument === "category" && (
            <select className="stc-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select category...</option>
              {(filters?.categories || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {instrument === "product" && (
            <select className="stc-select" value={plantId} onChange={(e) => setPlantId(e.target.value)}>
              <option value="">Select product...</option>
              {(filters?.plants || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="stc-divider" />

        <div className="stc-toolbar-group">
          {["1D", "1W", "1M"].map((t) => (
            <button key={t} type="button" className={`stc-btn ${timeframe === t ? "stc-active" : ""}`} onClick={() => setTimeframe(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="stc-divider" />

        <select className="stc-select" value={chartType} onChange={(e) => setChartType(e.target.value)}>
          {CHART_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select className="stc-select" value={volumeType} onChange={(e) => setVolumeType(e.target.value)}>
          <option value="orders">Vol: Orders</option>
          <option value="units">Vol: Units</option>
        </select>

        <div style={{ position: "relative" }}>
          <button type="button" className={`stc-btn ${showIndicatorsMenu ? "stc-active" : ""}`} onClick={() => setShowIndicatorsMenu((v) => !v)}>
            📊 Indicators
          </button>
          {showIndicatorsMenu && <IndicatorsMenu onAdd={addIndicator} onClose={() => setShowIndicatorsMenu(false)} />}
        </div>
        <button type="button" className="stc-btn" disabled title="Alerts -- coming in a later phase">🔔 Alert</button>
        <button type="button" className="stc-btn" disabled title="Replay -- coming in a later phase">↺ Replay</button>

        <div className="stc-spacer" />

        <button type="button" className="stc-btn" disabled title="Save layout -- coming in a later phase">Save</button>
        <button type="button" className="stc-btn" disabled title="Settings -- coming in a later phase">⚙</button>
        <button type="button" className="stc-btn" onClick={toggleFullscreen} title="Fullscreen">
          {isFullscreen ? "⤡" : "⛶"}
        </button>
      </div>

      {/* ---------- Chart body ---------- */}
      <div className="stc-body">
        {data && data.has_data && !error && (
          <DrawingToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={history.length > 0}
            canRedo={future.length > 0}
            onClearDrawings={handleClearDrawings}
            magnet={magnet}
            onToggleMagnet={() => setMagnet((v) => !v)}
            locked={locked}
            onToggleLocked={() => setLocked((v) => !v)}
            hidden={drawingsHidden}
            onToggleHidden={() => setDrawingsHidden((v) => !v)}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
          />
        )}

        <div className="stc-chart-col">
          {error ? (
            <div style={{ padding: 20 }}>
              <div className="alert alert-error">⚠ {error}</div>
            </div>
          ) : !data ? (
            <div style={{ padding: 40 }}><Loading /></div>
          ) : !data.has_data ? (
            <div style={{ padding: 40 }}><Empty>No Data Available for this period.</Empty></div>
          ) : (
            <>
              <div className="stc-chart-title">
                <span className="stc-symbol">{symbolLabel} · {timeframe}{zoomWindow ? " (zoomed)" : ""}</span>
                {last && (
                  <div className="stc-ohlc">
                    <span>O <b>₹{last.open.toLocaleString()}</b></span>
                    <span>H <b>₹{last.high.toLocaleString()}</b></span>
                    <span>L <b>₹{last.low.toLocaleString()}</b></span>
                    <span>C <b>₹{last.close.toLocaleString()}</b></span>
                    <span className={data.change_amount >= 0 ? "stc-up" : "stc-down"}>
                      {data.change_amount >= 0 ? "+" : ""}₹{data.change_amount.toLocaleString()} ({data.change_pct >= 0 ? "+" : ""}{data.change_pct}%)
                    </span>
                  </div>
                )}
                {crosshairInfo?.point && (
                  <div className="stc-ohlc">
                    <span className="stc-muted">{fmtDate(crosshairInfo.point.timestamp)}</span>
                    <span>₹{crosshairInfo.point.close.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {activeIndicators.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "2px 14px 6px", fontSize: "0.74rem" }}>
                  {activeIndicators.map((ind, i) => {
                    const color = INDICATOR_COLORS[i % INDICATOR_COLORS.length];
                    const lastRow = ind.type === "RSI" ? rsiData[rsiData.length - 1] : ind.type === "MACD" ? macdData[macdData.length - 1] : chartData[chartData.length - 1];
                    const lastVal =
                      ind.type === "BB" ? lastRow?.[`ind_${ind.id}_middle`] :
                      ind.type === "MACD" ? lastRow?.[`ind_${ind.id}_macd`] :
                      lastRow?.[`ind_${ind.id}`];
                    return (
                      <div key={ind.id} style={{ display: "flex", alignItems: "center", gap: 4, color }}>
                        <span>
                          {ind.type} {ind.params.period ?? `${ind.params.fast}/${ind.params.slow}/${ind.params.signal}`}
                        </span>
                        {lastVal != null && <b>{ind.type === "RSI" ? lastVal.toFixed(1) : `₹${Math.round(lastVal).toLocaleString()}`}</b>}
                        {ind.params.period != null && (
                          <input
                            type="number"
                            min={2}
                            value={ind.params.period}
                            onChange={(e) => updateIndicatorParam(ind.id, "period", Math.max(2, Number(e.target.value) || 2))}
                            style={{ width: 42, background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9", borderRadius: 3, fontSize: "0.7rem" }}
                          />
                        )}
                        <button type="button" onClick={() => removeIndicator(ind.id)} style={{ background: "none", border: "none", color: "#6e7681", cursor: "pointer" }} title="Remove">✕</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                ref={chartAreaRef}
                style={{ flex: 1, minHeight: 0, padding: "0 4px", position: "relative", cursor: activeTool === "cursor" ? "grab" : undefined }}
                onWheel={handleWheelZoom}
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
                onDoubleClick={handleZoomReset}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "Line" ? (
                    <ComposedChart data={chartData} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                      <YAxis orientation="right" width={Y_AXIS_WIDTH} domain={yDomain} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CandleTooltip volumeType={volumeType} />} cursor={false} />
                      <Line type="monotone" dataKey="close" stroke="#58a6ff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      {renderOverlayLines(overlayIndicators)}
                    </ComposedChart>
                  ) : chartType === "Area" ? (
                    <ComposedChart data={chartData} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                      <YAxis orientation="right" width={Y_AXIS_WIDTH} domain={yDomain} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CandleTooltip volumeType={volumeType} />} cursor={false} />
                      <Area type="monotone" dataKey="close" stroke="#58a6ff" fill="#58a6ff" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
                      {renderOverlayLines(overlayIndicators)}
                    </ComposedChart>
                  ) : (
                    <ComposedChart data={chartData} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                      <YAxis orientation="right" width={Y_AXIS_WIDTH} domain={yDomain} tick={{ fontSize: 11 }} />
                      <Tooltip content={<CandleTooltip volumeType={volumeType} />} cursor={false} />
                      <Bar dataKey="wickRange" barSize={chartType === "Bars" ? 1 : 2} isAnimationActive={false}>
                        {points.map((p, i) => (
                          <Cell key={i} fill={p.close >= p.open ? UP_COLOR : DOWN_COLOR} />
                        ))}
                      </Bar>
                      <Bar dataKey="bodyRange" barSize={chartType === "Bars" ? 6 : 9} isAnimationActive={false}>
                        {points.map((p, i) => (
                          <Cell key={i} fill={p.close >= p.open ? UP_COLOR : DOWN_COLOR} />
                        ))}
                      </Bar>
                      {renderOverlayLines(overlayIndicators)}
                    </ComposedChart>
                  )}
                </ResponsiveContainer>

                {containerSize.width > 0 && (
                  <DrawingOverlay
                    points={points}
                    yDomain={yDomain}
                    containerSize={containerSize}
                    activeTool={activeTool}
                    drawings={drawings}
                    onDrawingsChange={onDrawingsChange}
                    onCrosshairChange={setCrosshairInfo}
                    magnet={magnet}
                    locked={locked}
                    hidden={drawingsHidden}
                  />
                )}
              </div>

              <ResizeHandle onResize={(delta) => resizePanel("volume", delta)} />
              <div className="stc-panel" style={{ height: panelHeights.volume }}>
                <div className="stc-panel-label">
                  <span>Volume ({volumeType === "orders" ? "Orders" : "Units"})</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={points} margin={{ top: 18, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="timestamp" hide />
                    <YAxis orientation="right" tick={{ fontSize: 10 }} width={Y_AXIS_WIDTH} />
                    <Tooltip content={<CandleTooltip volumeType={volumeType} />} cursor={false} />
                    <Bar dataKey="volume" isAnimationActive={false}>
                      {points.map((p, i) => (
                        <Cell key={i} fill={p.close >= p.open ? `${UP_COLOR}99` : `${DOWN_COLOR}99`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {rsiIndicators.length > 0 && (
                <>
                  <ResizeHandle onResize={(delta) => resizePanel("rsi", delta)} />
                  <div className="stc-panel" style={{ height: panelHeights.rsi }}>
                    <div className="stc-panel-label">
                      <span>RSI {rsiIndicators.map((i) => i.params.period).join(", ")}</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={rsiData} margin={{ top: 18, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="timestamp" hide />
                        <YAxis orientation="right" domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fontSize: 10 }} width={Y_AXIS_WIDTH} />
                        <Tooltip content={<IndicatorTooltip />} cursor={false} />
                        {[30, 50, 70].map((lvl) => (
                          <ReferenceLine key={lvl} y={lvl} stroke="#30363d" strokeDasharray="3 3" />
                        ))}
                        {rsiIndicators.map((ind, i) => (
                          <Line key={ind.id} type="monotone" dataKey={`ind_${ind.id}`} stroke={INDICATOR_COLORS[i % INDICATOR_COLORS.length]} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {macdIndicators.length > 0 && (
                <>
                  <ResizeHandle onResize={(delta) => resizePanel("macd", delta)} />
                  <div className="stc-panel" style={{ height: panelHeights.macd }}>
                    <div className="stc-panel-label">
                      <span>MACD {macdIndicators.map((i) => `${i.params.fast}/${i.params.slow}/${i.params.signal}`).join(", ")}</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={macdData} margin={{ top: 18, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="timestamp" hide />
                        <YAxis orientation="right" tick={{ fontSize: 10 }} width={Y_AXIS_WIDTH} />
                        <Tooltip content={<IndicatorTooltip />} cursor={false} />
                        {macdIndicators.map((ind) => (
                          <Bar key={`${ind.id}_hist`} dataKey={`ind_${ind.id}_hist`} isAnimationActive={false}>
                            {macdData.map((row, i) => (
                              <Cell key={i} fill={(row[`ind_${ind.id}_hist`] ?? 0) >= 0 ? `${UP_COLOR}99` : `${DOWN_COLOR}99`} />
                            ))}
                          </Bar>
                        ))}
                        {macdIndicators.map((ind, i) => (
                          <Line key={`${ind.id}_macd`} type="monotone" dataKey={`ind_${ind.id}_macd`} stroke={INDICATOR_COLORS[i % INDICATOR_COLORS.length]} strokeWidth={1.25} dot={false} isAnimationActive={false} connectNulls />
                        ))}
                        {macdIndicators.map((ind) => (
                          <Line key={`${ind.id}_signal`} type="monotone" dataKey={`ind_${ind.id}_signal`} stroke="#e3b341" strokeWidth={1.25} dot={false} isAnimationActive={false} connectNulls />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <Watchlist
          collapsed={watchlistCollapsed}
          onToggleCollapsed={() => setWatchlistCollapsed((v) => !v)}
          onSelect={handleWatchlistSelect}
          activeSelection={watchlistSelection}
          filters={filters}
        />
      </div>

      {/* ---------- Bottom timeframe bar ---------- */}
      <div className="stc-timebar">
        {TIMEFRAMES.map((t) => (
          <button key={t} type="button" className={`stc-btn ${timeframe === t ? "stc-active" : ""}`} onClick={() => setTimeframe(t)}>
            {t}
          </button>
        ))}
        <button type="button" className={`stc-btn ${timeframe === "CUSTOM" ? "stc-active" : ""}`} onClick={() => setTimeframe("CUSTOM")}>
          Custom
        </button>
        {timeframe === "CUSTOM" && (
          <>
            <input type="date" className="stc-select" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span>to</span>
            <input type="date" className="stc-select" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </>
        )}
        <div className="stc-spacer-line" />
        <span>Asia/Kolkata</span>
      </div>
    </div>
  );
}
