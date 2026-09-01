import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function Payments() {
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
    payment_date: todayDateInput(),
    method: "Cash",
    reference: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  function load() {
    setRows(null);
    setLoadError("");
    const query = workerType ? `?worker_type=${workerType}` : "";
    api.get(`/admin/labour/payments${query}`).then(setRows).catch((err) => setLoadError(err.message || "Could not load payments."));
  }

  useEffect(load, [workerType]);

  function openForm() {
    setForm({
      worker_type: "EMPLOYEE",
      employee_id: "",
      labour_id: "",
      amount: 0,
      payment_date: todayDateInput(),
      method: "Cash",
      reference: "",
      notes: "",
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
      await api.post("/admin/labour/payments", {
        worker_type: form.worker_type,
        employee_id: form.worker_type === "EMPLOYEE" ? Number(form.employee_id) : null,
        labour_id: form.worker_type === "LABOUR" ? Number(form.labour_id) : null,
        amount: form.amount,
        payment_date: form.payment_date,
        method: form.method,
        reference: form.reference,
        notes: form.notes,
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || "Could not record this payment.");
    } finally {
      setSaving(false);
    }
  }

  const workerOptions = form.worker_type === "EMPLOYEE" ? employees : labourList;

  return (
    <div>
      <div className="admin-page-head">
        <h1>Payments</h1>
        <button className="btn btn-sm btn-primary" onClick={openForm}>
          + Record Payment
        </button>
      </div>

      <div className="form-group" style={{ maxWidth: 200, marginBottom: 16 }}>
        <select className="form-control" value={workerType} onChange={(e) => setWorkerType(e.target.value)}>
          <option value="">All Worker Types</option>
          <option value="EMPLOYEE">Employee</option>
          <option value="LABOUR">Labour</option>
        </select>
      </div>

      {loadError ? (
        <div className="alert alert-error">
          {loadError} <button type="button" className="btn btn-outline dark" onClick={load}>Retry</button>
        </div>
      ) : !rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No payments recorded yet.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td>{p.worker_type}</td>
                  <td>₹{p.amount.toLocaleString()}</td>
                  <td>{p.method}</td>
                  <td>{p.reference || "-"}</td>
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
            <h3 style={{ marginTop: 0 }}>Record Payment</h3>
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
                <label>Payment Date</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={form.payment_date}
                  onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Method</label>
                <select className="form-control" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
                  {["Cash", "Bank Transfer", "UPI", "Card", "Other"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reference (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                />
              </div>
              <button className="btn btn-primary btn-block" disabled={saving}>
                {saving ? "Saving..." : "Save Payment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
