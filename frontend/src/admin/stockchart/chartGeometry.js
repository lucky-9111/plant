// Deterministic pixel <-> data-coordinate mapping for the Stock Chart's
// drawing overlay. This has to mirror the EXACT margin/axis settings the
// main recharts <ComposedChart> uses (see StockChart.jsx) -- recharts has
// no public API for "give me your x/y scale", so the overlay recomputes
// the same layout recharts would produce, as long as both sides agree on
// fixed margins/axis widths (never auto-sized) so nothing can drift apart.
export const CHART_MARGIN_TOP = 8;
export const CHART_MARGIN_LEFT = 0;
export const Y_AXIS_WIDTH = 60; // matches <YAxis width={60}> in StockChart.jsx
export const X_AXIS_HEIGHT = 22; // recharts' default reserved height for one line of tick labels

export function plotRect(containerWidth, containerHeight) {
  return {
    left: CHART_MARGIN_LEFT,
    top: CHART_MARGIN_TOP,
    width: Math.max(0, containerWidth - CHART_MARGIN_LEFT - Y_AXIS_WIDTH),
    height: Math.max(0, containerHeight - CHART_MARGIN_TOP - X_AXIS_HEIGHT),
  };
}

export function xForIndex(index, pointCount, rect) {
  if (pointCount <= 1) return rect.left + rect.width / 2;
  return rect.left + (index / (pointCount - 1)) * rect.width;
}

export function indexForX(x, pointCount, rect) {
  if (pointCount <= 1) return 0;
  const frac = (x - rect.left) / rect.width;
  return Math.round(Math.min(Math.max(frac, 0), 1) * (pointCount - 1));
}

export function yForValue(value, yDomain, rect) {
  const [lo, hi] = yDomain;
  if (hi === lo) return rect.top + rect.height / 2;
  const frac = (value - lo) / (hi - lo);
  return rect.top + rect.height - frac * rect.height;
}

export function valueForY(y, yDomain, rect) {
  const [lo, hi] = yDomain;
  const frac = (rect.top + rect.height - y) / rect.height;
  return lo + frac * (hi - lo);
}

// Percentile-based (not raw min/max) Y domain. Unlike an actual stock's
// price, one "tick" here is a whole order's rupee value -- a single large
// bulk order can legitimately be 50-100x a typical small one, on the same
// day as perfectly ordinary orders. A raw-min/max domain would let that
// one outlier stretch the whole scale and squash every normal candle into
// an unreadable sliver at the bottom (this is a real thing that happened,
// not a hypothetical). Real charting platforms hit the same problem and
// solve it the same way: fit the scale to the bulk of the data, and let
// rare extreme values clip at the edges rather than dictate the view --
// the user can still Zoom In on that specific candle to see it in full.
export function computeYDomain(points) {
  if (!points.length) return [0, 1];
  const values = [];
  for (const p of points) {
    values.push(p.low, p.high);
  }
  values.sort((a, b) => a - b);

  const pct = (p) => values[Math.min(values.length - 1, Math.max(0, Math.round(p * (values.length - 1))))];
  let lo = pct(0.05);
  let hi = pct(0.95);

  if (hi === lo) {
    lo = values[0];
    hi = values[values.length - 1];
  }
  if (hi === lo) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.15;
  return [Math.max(0, lo - pad), hi + pad];
}
