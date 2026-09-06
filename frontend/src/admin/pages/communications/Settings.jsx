import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading } from "../../../components/Loading";

export default function CommunicationsSettings() {
  const [items, setItems] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    setItems(null);
    api.get("/admin/communications/settings").then(setItems);
  }

  useEffect(load, []);

  function toggle(eventType) {
    setSaved(false);
    setItems((prev) => prev.map((it) => (it.event_type === eventType ? { ...it, enabled: !it.enabled } : it)));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const settings = {};
      items.forEach((it) => { settings[it.event_type] = it.enabled; });
      await api.put("/admin/communications/settings", { settings });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Automatic Notification Settings</h1>
        <button className="btn btn-primary" disabled={saving || !items} onClick={handleSave}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
      <p style={{ color: "var(--color-text-muted)", marginTop: -8, marginBottom: 20, fontSize: "0.88rem" }}>
        Turn off an event to stop it from ever being queued automatically. Manual "Send Message" sends are never affected by these toggles.
      </p>

      {saved && <div className="alert alert-success" style={{ marginBottom: 16 }}>Settings saved.</div>}

      {!items ? (
        <Loading />
      ) : (
        <div className="admin-form-card">
          {items.map((it) => (
            <div key={it.event_type} className="checkbox-row" style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <input
                id={it.event_type}
                type="checkbox"
                checked={it.enabled}
                onChange={() => toggle(it.event_type)}
              />
              <label htmlFor={it.event_type} style={{ margin: 0, flex: 1 }}>
                {it.label || it.event_type}
                <span style={{ color: "var(--color-text-muted)", marginLeft: 8, fontSize: "0.8rem" }}>{it.event_type}</span>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
