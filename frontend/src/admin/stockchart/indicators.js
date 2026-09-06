// Pure functions computing real indicator series from the chart's actual
// `close` values -- no fabricated data. Every function returns an array
// the same length as the input, with `null` wherever there isn't yet
// enough history for that period (e.g. SMA 200 on a 40-point series is
// null everywhere) rather than a fake early value.

export function sma(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values, period) {
  const out = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev = null;
  for (let i = 0; i < values.length; i++) {
    if (values[i] == null) continue;
    if (prev == null) {
      if (i >= period - 1) {
        let seedSum = 0;
        for (let j = i - period + 1; j <= i; j++) seedSum += values[j];
        prev = seedSum / period;
        out[i] = prev;
      }
    } else {
      prev = values[i] * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

function stddevFromMean(values, period, meanArr) {
  const out = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    if (meanArr[i] == null) continue;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j] - meanArr[i]) ** 2;
    out[i] = Math.sqrt(variance / period);
  }
  return out;
}

export function bollingerBands(values, period, deviations) {
  const middle = sma(values, period);
  const sd = stddevFromMean(values, period, middle);
  const upper = values.map((_, i) => (middle[i] == null ? null : middle[i] + deviations * sd[i]));
  const lower = values.map((_, i) => (middle[i] == null ? null : middle[i] - deviations * sd[i]));
  return { upper, middle, lower };
}

// Wilder's smoothing (the standard RSI formula).
export function rsi(values, period) {
  const out = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    gainSum += Math.max(change, 0);
    lossSum += Math.max(-change, 0);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function macd(values, fast, slow, signal) {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = values.map((_, i) => (emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null));
  const signalLine = ema(macdLine, signal);
  const histogram = values.map((_, i) => (macdLine[i] != null && signalLine[i] != null ? macdLine[i] - signalLine[i] : null));
  return { macdLine, signalLine, histogram };
}

export const INDICATOR_DEFAULTS = {
  SMA: { period: 20 },
  EMA: { period: 50 },
  BB: { period: 20, deviations: 2 },
  RSI: { period: 14 },
  MACD: { fast: 12, slow: 26, signal: 9 },
};

export const INDICATOR_COLORS = ["#e3b341", "#58a6ff", "#a371f7", "#f778ba", "#3fb950", "#ff7b72"];
