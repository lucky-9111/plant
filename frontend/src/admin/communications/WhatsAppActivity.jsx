import { useEffect, useState } from "react";
import { api } from "../../api";

const STATUS_BADGE = {
  SENT: "badge-accent", DELIVERED: "badge-accent", READ: "badge-accent",
  QUEUED: "badge-gold", PROCESSING: "badge-gold",
  FAILED: "badge-danger", CANCELLED: "badge-muted",
};

// One shared component embedded in Order/Delivery/Invoice/Customer detail
// pages alike -- always reads the SAME centralized message table via
// (source_module, source_id) or customer_id, never a per-module copy.
export default function WhatsAppActivity({ sourceModule, sourceId, customerId, title = "WhatsApp Activity" }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    setItems(null);
    const params = new URLSearchParams();
    if (sourceModule) params.set("source_module", sourceModule);
    if (sourceId != null) params.set("source_id", String(sourceId));
    if (customerId != null) params.set("customer_id", String(customerId));
    params.set("limit", "50");
    api.get(`/admin/communications/messages?${params.toString()}`).then((d) => setItems(d.items)).catch(() => setItems([]));
  }, [sourceModule, sourceId, customerId]);

  if (items === null) return null;
  if (items.length === 0) {
    return (
      <div className="admin-form-card" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: "var(--color-text-muted)", margin: 0 }}>No WhatsApp messages yet for this record.</p>
      </div>
    );
  }

  return (
    <div className="admin-form-card" style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.86rem", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
            <div>
              <strong>{new Date(m.created_at).toLocaleString()}</strong> -- {m.event_type.replaceAll("_", " ")}
              {m.error_message && <div style={{ color: "var(--color-danger)", fontSize: "0.78rem" }}>{m.error_code}: {m.error_message}</div>}
            </div>
            <span className={`badge ${STATUS_BADGE[m.status] || "badge-muted"}`}>{m.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
