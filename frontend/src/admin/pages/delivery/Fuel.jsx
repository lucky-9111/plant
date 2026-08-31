import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function Fuel() {
  const [logs, setLogs] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: todayDateInput(), vehicle_id: "", driver_id: "", fuel_type: "Petrol",
    litres: 0, rate_per_litre: 0, odometer_reading: "", petrol_pump: "", payment_method: "Cash", receipt_reference: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLogs(null);
    api.get("/admin/delivery/fuel").then(setLogs);
  }

  useEffect(load, []);

  function openForm() {
    setForm({
      date: todayDateInput(), vehicle_id: "", driver_id: "", fuel_type: "Petrol",
      litres: 0, rate_per_litre: 0, odometer_reading: "", petrol_pump: "", payment_method: "Cash", receipt_reference: "",
    });
    setError("");
    api.get("/admin/delivery/vehicles").then(setVehicles);
    api.get("/admin/delivery/drivers?status=Active").then(setDrivers);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/delivery/fuel", {
        ...form,
        vehicle_id: Number(form.vehicle_id),
        driver_id: form.driver_id ? Number(form.driver_id) : null,
        odometer_reading: form.odometer_reading ? Number(form.odometer_reading) : null,
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || "Could not save this fuel record.");
    } finally {
      setSaving(false);
    }
  }

  const totalAmount = (form.litres * form.rate_per_litre).toFixed(2);

  return (
    <div>
      <div className="admin-page-head">
        <h1>Fuel / Petrol</h1>
        <button className="btn btn-sm btn-primary" onClick={openForm}>+ Add Fuel Record</button>
      </div>

      {!logs ? (
        <Loading />
      ) : logs.length === 0 ? (
        <Empty>No fuel records yet.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Vehicle</th><th>Litres</th><th>Rate</th><th>Amount</th><th>Odometer</th><th>Payment</th></tr></thead>
            <tbody>
              {logs.map((f) => (
                <tr key={f.id}>
                  <td>{new Date(f.date).toLocaleDateString()}</td>
                  <td>{f.vehicle_id}</td>
                  <td>{f.litres}</td>
                  <td>₹{f.rate_per_litre}</td>
                  <td>₹{f.total_amount.toLocaleString()}</td>
                  <td>{f.odometer_reading ?? "-"}</td>
                  <td>{f.payment_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => !saving && setShowForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowForm(false)}>&times;</button>
            <h3 style={{ marginTop: 0 }}>Add Fuel Record</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Date</label>
                <input type="date" className="form-control" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Vehicle</label>
                <select className="form-control" required value={form.vehicle_id} onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
                  <option value="">Select vehicle...</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Driver (optional)</label>
                <select className="form-control" value={form.driver_id} onChange={(e) => setForm((f) => ({ ...f, driver_id: e.target.value }))}>
                  <option value="">-</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Litres</label>
                <input type="number" step="any" className="form-control" required value={form.litres} onChange={(e) => setForm((f) => ({ ...f, litres: e.target.valueAsNumber || 0 }))} />
              </div>
              <div className="form-group">
                <label>Rate per Litre (₹)</label>
                <input type="number" step="any" className="form-control" required value={form.rate_per_litre} onChange={(e) => setForm((f) => ({ ...f, rate_per_litre: e.target.valueAsNumber || 0 }))} />
              </div>
              <p style={{ color: "var(--color-text-muted)" }}>Total Amount: ₹{totalAmount}</p>
              <div className="form-group">
                <label>Odometer Reading (optional)</label>
                <input type="number" className="form-control" value={form.odometer_reading} onChange={(e) => setForm((f) => ({ ...f, odometer_reading: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Petrol Pump (optional)</label>
                <input type="text" className="form-control" value={form.petrol_pump} onChange={(e) => setForm((f) => ({ ...f, petrol_pump: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select className="form-control" value={form.payment_method} onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}>
                  {["Cash", "Card", "UPI", "Company Account", "Other"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-block" disabled={saving}>{saving ? "Saving..." : "Save Fuel Record"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
