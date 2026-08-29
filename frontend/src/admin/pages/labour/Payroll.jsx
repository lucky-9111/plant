import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";
import { payrollStatusBadgeClass } from "../../labour/labourStatus";

const now = new Date();

export default function Payroll() {
  const [rows, setRows] = useState(null);
  const [workerType, setWorkerType] = useState("");
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [showGenerate, setShowGenerate] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [labourList, setLabourList] = useState([]);
  const [genForm, setGenForm] = useState({ worker_type: "EMPLOYEE", employee_id: "", labour_id: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ advance_recovery: 0, deductions: 0, notes: "" });

  function load() {
    setRows(null);
    const params = new URLSearchParams();
    if (workerType) params.set("worker_type", workerType);
    if (periodYear) params.set("period_year", periodYear);
    if (periodMonth) params.set("period_month", periodMonth);
    api.get(`/admin/labour/payroll?${params.toString()}`).then(setRows);
  }

  useEffect(load, [workerType, periodYear, periodMonth]);

  function openGenerate() {
    setGenForm({ worker_type: "EMPLOYEE", employee_id: "", labour_id: "" });
    setError("");
    api.get("/admin/labour/employees?status=Active").then(setEmployees);
    api.get("/admin/labour/labour?status=Active").then(setLabourList);
    setShowGenerate(true);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/labour/payroll/generate", {
        worker_type: genForm.worker_type,
        period_year: Number(periodYear),
        period_month: Number(periodMonth),
        employee_id: genForm.worker_type === "EMPLOYEE" ? Number(genForm.employee_id) : null,
        labour_id: genForm.worker_type === "LABOUR" ? Number(genForm.labour_id) : null,
      });
      setShowGenerate(false);
      load();
    } catch (err) {
      setError(err.message || "Could not generate payroll.");
    } finally {
      setSaving(false);
    }
  }

  function openAdjust(row) {
    setAdjustForm({ advance_recovery: row.advance_recovery, deductions: row.deductions, notes: row.notes || "" });
    setAdjusting(row);
    setError("");
  }

  async function handleAdjust(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put(`/admin/labour/payroll/${adjusting.id}/adjust`, adjustForm);
      setAdjusting(null);
      load();
    } catch (err) {
      setError(err.message || "Could not adjust payroll.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize(row) {
    if (!confirm("Finalize this payroll? It will be locked from further edits until reopened.")) return;
    await api.post(`/admin/labour/payroll/${row.id}/finalize`);
    load();
  }

  async function handleReopen(row) {
    await api.post(`/admin/labour/payroll/${row.id}/reopen`);
    load();
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Payroll</h1>
        <button className="btn btn-sm btn-primary" onClick={openGenerate}>
          + Generate Payroll
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select className="form-control" style={{ maxWidth: 160 }} value={workerType} onChange={(e) => setWorkerType(e.target.value)}>
          <option value="">All Worker Types</option>
          <option value="EMPLOYEE">Employee</option>
          <option value="LABOUR">Labour</option>
        </select>
        <input
          type="number"
          className="form-control"
          style={{ maxWidth: 120 }}
          value={periodYear}
          onChange={(e) => setPeriodYear(e.target.valueAsNumber || now.getFullYear())}
        />
        <select className="form-control" style={{ maxWidth: 160 }} value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
      </div>

      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No payroll generated for this period yet.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Type</th>
                <th>Days</th>
                <th>Gross</th>
                <th>Advance Recovery</th>
                <th>Deductions</th>
                <th>Net Payable</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.worker_name}</td>
                  <td>{r.worker_type}</td>
                  <td>{r.days_present}</td>
                  <td>₹{r.gross_earnings.toLocaleString()}</td>
                  <td>₹{r.advance_recovery.toLocaleString()}</td>
                  <td>₹{r.deductions.toLocaleString()}</td>
                  <td>₹{r.net_payable.toLocaleString()}</td>
                  <td>₹{r.total_paid.toLocaleString()}</td>
                  <td>₹{r.outstanding.toLocaleString()}</td>
                  <td><span className={`badge ${payrollStatusBadgeClass(r.status)}`}>{r.status}</span></td>
                  <td>
                    <div className="row-actions">
                      {r.status === "Draft" ? (
                        <>
                          <button className="btn btn-sm btn-outline dark" onClick={() => openAdjust(r)}>
                            Adjust
                          </button>
                          <button className="btn btn-sm btn-primary" onClick={() => handleFinalize(r)}>
                            Finalize
                          </button>
                        </>
                      ) : (
                        <button className="btn btn-sm btn-outline dark" onClick={() => handleReopen(r)}>
                          Reopen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showGenerate && (
        <div className="modal-overlay" onClick={() => !saving && setShowGenerate(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowGenerate(false)}>
              &times;
            </button>
            <h3 style={{ marginTop: 0 }}>Generate Payroll ({periodMonth}/{periodYear})</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleGenerate}>
              <div className="form-group">
                <label>Worker Type</label>
                <select
                  className="form-control"
                  value={genForm.worker_type}
                  onChange={(e) => setGenForm((f) => ({ ...f, worker_type: e.target.value }))}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="LABOUR">Labour</option>
                </select>
              </div>
              {genForm.worker_type === "EMPLOYEE" ? (
                <div className="form-group">
                  <label>Employee</label>
                  <select
                    className="form-control"
                    required
                    value={genForm.employee_id}
                    onChange={(e) => setGenForm((f) => ({ ...f, employee_id: e.target.value }))}
                  >
                    <option value="">Select an employee...</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label>Labour</label>
                  <select
                    className="form-control"
                    required
                    value={genForm.labour_id}
                    onChange={(e) => setGenForm((f) => ({ ...f, labour_id: e.target.value }))}
                  >
                    <option value="">Select a labour worker...</option>
                    {labourList.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button className="btn btn-primary btn-block" disabled={saving}>
                {saving ? "Generating..." : "Generate"}
              </button>
            </form>
          </div>
        </div>
      )}

      {adjusting && (
        <div className="modal-overlay" onClick={() => !saving && setAdjusting(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setAdjusting(null)}>
              &times;
            </button>
            <h3 style={{ marginTop: 0 }}>Adjust Payroll -- {adjusting.worker_name}</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleAdjust}>
              <div className="form-group">
                <label>Advance Recovery (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  value={adjustForm.advance_recovery}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, advance_recovery: e.target.valueAsNumber || 0 }))}
                />
              </div>
              <div className="form-group">
                <label>Other Deductions (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  value={adjustForm.deductions}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, deductions: e.target.valueAsNumber || 0 }))}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <button className="btn btn-primary btn-block" disabled={saving}>
                {saving ? "Saving..." : "Save Adjustment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
