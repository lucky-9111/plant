import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderAlerts } from "./OrderAlertContext";

const STATUS_DOT = { live: "🟢", connecting: "🟡", reconnecting: "🟡", disconnected: "🔴" };

function timeAgo(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export default function OrderAlertBell() {
  const { alerts, status, muted, setMuted, dismissAlert } = useOrderAlerts();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function openOrder(orderId) {
    setOpen(false);
    dismissAlert(orderId);
    navigate(`/admin/orders/${orderId}`);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-sm btn-outline dark"
        onClick={() => setOpen((v) => !v)}
        title={`Order alerts: ${STATUS_DOT[status] || ""} ${status}`}
        style={{ position: "relative" }}
      >
        🔔 New Orders
        {alerts.length > 0 && (
          <span
            style={{
              position: "absolute", top: -8, right: -8, background: "var(--color-danger)", color: "#fff",
              borderRadius: "999px", fontSize: "0.7rem", padding: "1px 6px", fontWeight: 700,
            }}
          >
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)", width: 340, maxHeight: 420, overflowY: "auto",
            background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, padding: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong>New Orders ({alerts.length})</strong>
            <button type="button" className="btn btn-sm btn-outline dark" onClick={() => setMuted(!muted)}>
              {muted ? "🔇 Unmute" : "🔊 Notifications: ON"}
            </button>
          </div>

          {alerts.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", margin: 0 }}>✓ No new orders</p>
          ) : (
            alerts.map((a) => (
              <div key={a.order_id} style={{ borderBottom: "1px solid var(--color-border)", padding: "10px 0" }}>
                <div style={{ fontWeight: 700 }}>Order #{a.order_id}</div>
                <div>{a.customer_name}</div>
                <div>&#8377;{a.amount}</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>{timeAgo(a.timestamp)}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => openOrder(a.order_id)}>
                    View Order
                  </button>
                  <button type="button" className="btn btn-sm btn-outline dark" onClick={() => dismissAlert(a.order_id)}>
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
