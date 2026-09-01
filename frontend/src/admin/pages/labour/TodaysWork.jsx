import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";
import { workAssignmentBadgeClass } from "../../labour/labourStatus";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function TodaysWork() {
  const [requirements, setRequirements] = useState(null);
  const [labourList, setLabourList] = useState([]);
  const [mode, setMode] = useState("list");
  const [form, setForm] = useState({
    work_date: todayDateInput(),
    work_type: "",
    required_count: 1,
    location: "",
    estimated_hours: 8,
    notes: "",
    labour_ids: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  function load() {
    setRequirements(null);
    setLoadError("");
    api.get("/admin/labour/work-requirements").then(setRequirements).catch((err) => setLoadError(err.message || "Could not load today's work."));
  }

  useEffect(load, []);

  function startCreate() {
    setForm({
      work_date: todayDateInput(),
      work_type: "",
      required_count: 1,
      location: "",
      estimated_hours: 8,
      notes: "",
      labour_ids: [],
    });
    setError("");
    api.get("/admin/labour/labour?status=Active").then(setLabourList);
    setMode("form");
  }

  function toggleLabour(id) {
    setForm((f) => ({
      ...f,
      labour_ids: f.labour_ids.includes(id)
        ? f.labour_ids.filter((x) => x !== id)
        : [...f.labour_ids, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/labour/work-requirements", {
        work_date: form.work_date,
        work_type: form.work_type,
        required_count: form.required_count,
        location: form.location,
        estimated_hours: form.estimated_hours,
        notes: form.notes,
        labour_ids: form.labour_ids,
      });
      setMode("list");
      load();
    } catch (err) {
      setError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function updateAssignmentStatus(assignmentId, status) {
    await api.put(`/admin/labour/work-requirements/assignments/${assignmentId}/status`, { status });
    load();
  }

  if (mode === "form") {
    return (
      <div>
        <div className="admin-page-head">
          <h1>New Work Requirement</h1>
          <button className="btn btn-sm btn-outline dark" onClick={() => setMode("list")}>
            Back to List
          </button>
        </div>
        <div className="admin-form-card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="work_date">Date</label>
              <input
                id="work_date"
                type="date"
                className="form-control"
                required
                value={form.work_date}
                onChange={(e) => setForm((f) => ({ ...f, work_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="work_type">Work</label>
              <input
                id="work_type"
                type="text"
                className="form-control"
                placeholder="e.g. Plant Packing"
                value={form.work_type}
                onChange={(e) => setForm((f) => ({ ...f, work_type: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="required_count">Required Labour</label>
              <input
                id="required_count"
                type="number"
                className="form-control"
                value={form.required_count}
                onChange={(e) => setForm((f) => ({ ...f, required_count: e.target.valueAsNumber || 0 }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="location">Work Location</label>
              <input
                id="location"
                type="text"
                className="form-control"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="estimated_hours">Estimated Hours</label>
              <input
                id="estimated_hours"
                type="number"
                className="form-control"
                value={form.estimated_hours}
                onChange={(e) => setForm((f) => ({ ...f, estimated_hours: e.target.valueAsNumber || 0 }))}
              />
            </div>
            <div className="form-group">
              <label>Available Labour</label>
              {labourList.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)" }}>No active labour workers yet.</p>
              ) : (
                <div className="variants-field">
                  {labourList.map((l) => (
                    <label key={l.id} className="checkbox-row" style={{ display: "flex", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={form.labour_ids.includes(l.id)}
                        onChange={() => toggleLabour(l.id)}
                      />
                      <span>{l.name} ({l.work_type || "General"})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                className="form-control"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Send Work Request"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Today's Work</h1>
        <button className="btn btn-sm btn-primary" onClick={startCreate}>
          + New Work Requirement
        </button>
      </div>

      {loadError ? (
        <div className="alert alert-error">
          {loadError} <button type="button" className="btn btn-outline dark" onClick={load}>Retry</button>
        </div>
      ) : !requirements ? (
        <Loading />
      ) : requirements.length === 0 ? (
        <Empty>No work requirements yet. Create one to start calling labour.</Empty>
      ) : (
        requirements.map((r) => (
          <div key={r.id} className="admin-form-card" style={{ maxWidth: "none", marginBottom: 16 }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>
              {new Date(r.work_date).toLocaleDateString()} &middot; {r.work_type || "Work"}
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: -8 }}>
              Required: {r.required_count} &middot; {r.location} &middot; {r.estimated_hours}h
            </p>
            {r.assignments.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)" }}>No workers assigned yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Labour</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {r.assignments.map((a) => (
                      <tr key={a.id}>
                        <td>{a.labour?.name}</td>
                        <td><span className={`badge ${workAssignmentBadgeClass(a.status)}`}>{a.status}</span></td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-sm btn-outline dark" onClick={() => updateAssignmentStatus(a.id, "Accepted")}>
                              Accept
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => updateAssignmentStatus(a.id, "Rejected")}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
