import { useEffect, useState } from "react";
import { api } from "../../api";

// Real data only -- every row here is a real /admin/stock-chart call (the
// exact same endpoint the main chart uses), never a hardcoded/demo number.
// Kept to a small, bounded set of requests (3 core rows + up to 5 plants)
// so this stays cheap regardless of how much history exists.
const CORE_ROWS = [
  { key: "total", label: "TOTAL SALES", instrument: "total" },
  { key: "online", label: "ONLINE SALES", instrument: "online" },
  { key: "offline", label: "OFFLINE SALES", instrument: "offline" },
];

function Row({ label, value, changeAmount, changePct, onClick, active }) {
  const up = (changeAmount ?? 0) >= 0;
  return (
    <div
      onClick={onClick}
      style={{
        padding: "8px 12px", cursor: onClick ? "pointer" : "default",
        background: active ? "#1f6feb18" : "transparent", borderRadius: 4,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem" }}>
        <span style={{ color: "#c9d1d9" }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{value}</span>
      </div>
      {changeAmount != null && (
        <div style={{ textAlign: "right", fontSize: "0.7rem" }} className={up ? "stc-up" : "stc-down"}>
          {up ? "+" : ""}{changeAmount.toLocaleString()} ({up ? "+" : ""}{changePct}%)
        </div>
      )}
    </div>
  );
}

export default function Watchlist({ collapsed, onToggleCollapsed, onSelect, activeSelection, filters }) {
  const [coreData, setCoreData] = useState({});
  const [plantData, setPlantData] = useState({});

  useEffect(() => {
    if (collapsed) return;
    let cancelled = false;
    CORE_ROWS.forEach((row) => {
      api.get(`/admin/stock-chart?instrument=${row.instrument}&timeframe=1M`).then((d) => {
        if (!cancelled) setCoreData((prev) => ({ ...prev, [row.key]: d }));
      }).catch(() => {});
    });
    const topPlants = (filters?.plants || []).slice(0, 5);
    topPlants.forEach((plant) => {
      api.get(`/admin/stock-chart?instrument=product&plant_id=${plant.id}&timeframe=1M`).then((d) => {
        if (!cancelled) setPlantData((prev) => ({ ...prev, [plant.id]: d }));
      }).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, filters]);

  if (collapsed) {
    return (
      <button
        type="button"
        className="stc-btn"
        onClick={onToggleCollapsed}
        title="Show Watchlist"
        style={{ width: 22, borderLeft: "1px solid #21262d", borderRadius: 0, height: "100%" }}
      >
        ‹
      </button>
    );
  }

  const topPlants = (filters?.plants || []).slice(0, 5);

  return (
    <div style={{ width: 280, flexShrink: 0, borderLeft: "1px solid #21262d", background: "#131722", overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #21262d" }}>
        <strong style={{ fontSize: "0.78rem" }}>WATCHLIST</strong>
        <button type="button" className="stc-btn" onClick={onToggleCollapsed} title="Collapse" style={{ width: 22, height: 22, padding: 0, justifyContent: "center" }}>›</button>
      </div>

      <div style={{ padding: "4px 4px" }}>
        {CORE_ROWS.map((row) => {
          const d = coreData[row.key];
          const isActive = activeSelection?.instrument === row.instrument && activeSelection?.kind === "core";
          return (
            <Row
              key={row.key}
              label={row.label}
              value={d ? `₹${d.total_sales.toLocaleString()}` : "…"}
              changeAmount={d?.change_amount}
              changePct={d?.change_pct}
              active={isActive}
              onClick={() => onSelect({ kind: "core", instrument: row.instrument })}
            />
          );
        })}
        <Row label="ORDERS" value={coreData.total ? coreData.total.orders_count.toLocaleString() : "…"} />
        <Row label="UNITS SOLD" value={coreData.total ? coreData.total.units_count.toLocaleString() : "…"} />
      </div>

      {topPlants.length > 0 && (
        <>
          <div style={{ padding: "6px 12px", fontSize: "0.7rem", color: "#6e7681", borderTop: "1px solid #21262d" }}>PLANTS</div>
          <div style={{ padding: "0 4px 8px" }}>
            {topPlants.map((plant) => {
              const d = plantData[plant.id];
              const isActive = activeSelection?.kind === "plant" && String(activeSelection?.plantId) === String(plant.id);
              return (
                <Row
                  key={plant.id}
                  label={plant.name}
                  value={d ? `₹${d.total_sales.toLocaleString()}` : "…"}
                  changeAmount={d?.change_amount}
                  changePct={d?.change_pct}
                  active={isActive}
                  onClick={() => onSelect({ kind: "plant", plantId: plant.id })}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
