import { INDICATOR_DEFAULTS } from "./indicators";

const CATEGORIES = [
  { heading: "Trend", items: [
    { type: "SMA", label: "Moving Average (SMA)" },
    { type: "EMA", label: "Moving Average (EMA)" },
  ] },
  { heading: "Momentum", items: [
    { type: "RSI", label: "Relative Strength Index (RSI)" },
    { type: "MACD", label: "MACD" },
  ] },
  { heading: "Volatility", items: [
    { type: "BB", label: "Bollinger Bands" },
  ] },
];

export default function IndicatorsMenu({ onAdd, onClose }) {
  return (
    <div
      style={{
        position: "absolute", top: 34, left: 0, zIndex: 20, width: 260,
        background: "#161b22", border: "1px solid #30363d", borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)", padding: 8,
      }}
      onMouseLeave={onClose}
    >
      {CATEGORIES.map((cat) => (
        <div key={cat.heading} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: "0.7rem", color: "#6e7681", textTransform: "uppercase", padding: "4px 8px" }}>{cat.heading}</div>
          {cat.items.map((item) => (
            <button
              key={item.type}
              type="button"
              className="stc-btn"
              style={{ width: "100%", justifyContent: "flex-start", padding: "6px 8px" }}
              onClick={() => {
                onAdd({ id: crypto.randomUUID(), type: item.type, params: { ...INDICATOR_DEFAULTS[item.type] } });
                onClose();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
