import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function Advances() {
  const [rows, setRows] = useState(null);
  const [workerType, setWorkerType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [labourList, setLabourList] = useState([]);
  const [form, setForm] = useState({
    worker_type: "EMPLOYEE",
    employee_id: "",
    labour_id: "",
    amount: 0,
    advance_date: todayDateInput(),
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setRows(null);
    const query = workerType ? `?worker_type=${workerType}` : "";
    api.get(`/admin/labour/advances${query}`).then(setRows);
  }

  useEffect(load, [workerType]);

  function openForm() {
    setForm({
      worker_type: "EMPLOYEE",
      employee_id: "",
      labour_id: "",
      amount: 0,
      advance_date: todayDateInput(),
      reason: "",
    });
    setError("");
    api.get("/admin/labour/employees?status=Active").then(setEmployees);
    api.get("/admin/labour/labour?status=Active").then(setLabourList);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/labour/advances", {
        worker_type: form.worker_type,
        employee_id: form.worker_type === "EMPLOYEE" ? Number(form.employee_id) : null,
        labour_id: form.worker_type === "LABOUR" ? Number(form.labour_id) : null,
        amount: form.amount,
        advance_date: form.advance_date,
        reason: form.reason,
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || "Could not record this advance.");
    } finally {
      setSaving(false);
    }
  }

  const workerOptions = form.worker_type === "EMPLOYEE" ? employees : labourList;

  return (
    <div>
      <div className="admin-page-head">
        <h1>Advances</h1>
        <button className="btn btn-sm btn-primary" onClick={openForm}>
          + Give Advance
        </button>
      </div>

      <div className="form-group" style={{ maxWidth: 200, marginBottom: 16 }}>
        <select className="form-control" value={workerType} onChange={(e) => setWorkerType(e.target.value)}>
          <option value="">All Worker Types</option>
          <option value="EMPLOYEE">Employee</option>
          <option value="LABOUR">Labour</option>
        </select>
      </div>

      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No advances given yet.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Recovered</th>
                <th>Remaining</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.advance_date).toLocaleDateString()}</td>
                  <td>{a.worker_type}</td>
                  <td>₹{a.amount.toLocaleString()}</td>
                  <td>₹{a.recovered_amount.toLocaleString()}</td>
                  <td>₹{a.remaining_amount.toLocaleString()}</td>
                  <td>{a.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => !saving && setShowForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowForm(false)}>
              &times;
            </button>
            <h3 style={{ marginTop: 0 }}>Give Advance</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Worker Type</label>
                <select
                  className="form-control"
                  value={form.worker_type}
                  onChange={(e) => setForm((f) => ({ ...f, worker_type: e.target.value, employee_id: "", labour_id: "" }))}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="LABOUR">Labour</option>
                </select>
              </div>
              <div className="form-group">
                <label>Worker</label>
                <select
                  className="form-control"
                  required
                  value={form.worker_type === "EMPLOYEE" ? form.employee_id : form.labour_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [form.worker_type === "EMPLOYEE" ? "employee_id" : "labour_id"]: e.target.value,
                    }))
                  }
                >
                  <option value="">Select...</option>
                  {workerOptions.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.valueAsNumber || 0 }))}
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={form.advance_date}
                  onChange={(e) => setForm((f) => ({ ...f, advance_date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Reason (optional)</label>
                <textarea
                  className="form-control"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <button className="btn btn-primary btn-block" disabled={saving}>
                {saving ? "Saving..." : "Save Advance"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
