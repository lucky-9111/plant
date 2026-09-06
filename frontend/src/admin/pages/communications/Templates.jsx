import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";

const STATUSES = ["PENDING", "ACTIVE", "REJECTED", "DISABLED"];
const STATUS_BADGE = { ACTIVE: "badge-accent", PENDING: "badge-gold", REJECTED: "badge-danger", DISABLED: "badge-muted" };

const BLANK = { name: "", aisensy_campaign_name: "", category: "", language: "en_US", preview: "", variablesText: "", status: "PENDING" };

export default function Templates() {
  const [items, setItems] = useState(null);
  const [mode, setMode] = useState("list");
  const [editingName, setEditingName] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setItems(null);
    api.get("/admin/communications/templates").then(setItems);
  }

  useEffect(load, []);

  function startCreate() {
    setForm(BLANK);
    setEditingName(null);
    setError("");
    setMode("form");
  }

  function startEdit(item) {
    setForm({
      name: item.name, aisensy_campaign_name: item.aisensy_campaign_name, category: item.category,
      language: item.language, preview: item.preview, variablesText: item.variables.join(", "),
      status: item.status,
    });
    setEditingName(item.name);
    setError("");
    setMode("form");
  }

  async function handleDelete(item) {
    if (!confirm(`Delete template "${item.name}"? This cannot be undone.`)) return;
    const found = items.find((t) => t.name === item.name);
    await api.del(`/admin/communications/templates/${found.id}`);
    load();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name: form.name, aisensy_campaign_name: form.aisensy_campaign_name || form.name,
      category: form.category, language: form.language, preview: form.preview,
      variables: form.variablesText.split(",").map((v) => v.trim()).filter(Boolean),
      status: form.status,
    };
    try {
      if (editingName) {
        const found = items.find((t) => t.name === editingName);
        await api.put(`/admin/communications/templates/${found.id}`, payload);
      } else {
        await api.post("/admin/communications/templates", payload);
      }
      setMode("list");
      load();
    } catch (err) {
      setError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (mode === "form") {
    return (
      <div>
        <div className="admin-page-head">
          <h1>{editingName ? "Edit Template" : "Add Template"}</h1>
          <button className="btn btn-sm btn-outline dark" onClick={() => setMode("list")}>Back to List</button>
        </div>
        <div className="admin-form-card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Internal Name</label>
              <input className="form-control" required disabled={!!editingName} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. order_confirmed" />
            </div>
            <div className="form-group">
              <label>Meta / AiSensy Template Name</label>
              <input className="form-control" value={form.aisensy_campaign_name} onChange={(e) => setForm((f) => ({ ...f, aisensy_campaign_name: e.target.value }))} placeholder="Exact template name approved in Meta/AiSensy" />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input className="form-control" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="orders / accounting / delivery / website" />
            </div>
            <div className="form-group">
              <label>Language Code</label>
              <input className="form-control" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} placeholder="en_US" />
            </div>
            <div className="form-group">
              <label>Preview Text (use {"{{variable_name}}"} placeholders)</label>
              <textarea className="form-control" value={form.preview} onChange={(e) => setForm((f) => ({ ...f, preview: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Variables (comma-separated, in order -- these map to Meta's {"{{1}}"}, {"{{2}}"}... positionally)</label>
              <input className="form-control" value={form.variablesText} onChange={(e) => setForm((f) => ({ ...f, variablesText: e.target.value }))} placeholder="customer_name, order_number, amount" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <small style={{ color: "var(--color-text-muted)" }}>
                Only set to ACTIVE once you've personally confirmed this exact template name is approved in Meta/AiSensy -- the system never sends unless status is ACTIVE, no matter what any event mapping says.
              </small>
            </div>
            <button className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>WhatsApp Templates</h1>
        <button className="btn btn-sm btn-primary" onClick={startCreate}>+ Add Template</button>
      </div>
      <p style={{ color: "var(--color-text-muted)", marginTop: -8, marginBottom: 20, fontSize: "0.88rem" }}>
        A template must exist here AND be marked ACTIVE before any automatic or manual message can use it -- this is what stops the system from ever sending an unapproved template.
      </p>

      {!items ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty>No templates yet. Add your first one.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Variables</th>
                <th>Status</th>
                <th>Last Error</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.category || "-"}</td>
                  <td>{item.variables.join(", ") || "-"}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[item.status] || "badge-muted"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: 260, fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{item.last_error || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm btn-outline dark" onClick={() => startEdit(item)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
