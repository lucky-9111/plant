import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";
import { tripStatusBadgeClass } from "../../delivery/deliveryStatus";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function Trips() {
  const [trips, setTrips] = useState(null);
  const [status, setStatus] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showStart, setShowStart] = useState(false);
  const [startForm, setStartForm] = useState({ vehicle_id: "", driver_id: "", trip_date: todayDateInput(), start_km: 0 });
  const [endingTrip, setEndingTrip] = useState(null);
  const [endKm, setEndKm] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setTrips(null);
    const query = status ? `?status=${status}` : "";
    api.get(`/admin/delivery/trips${query}`).then(setTrips);
  }

  useEffect(load, [status]);

  function openStart() {
    setStartForm({ vehicle_id: "", driver_id: "", trip_date: todayDateInput(), start_km: 0 });
    setError("");
    api.get("/admin/delivery/vehicles?status=Available").then(setVehicles);
    api.get("/admin/delivery/drivers?status=Active").then(setDrivers);
    setShowStart(true);
  }

  async function handleStart(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/delivery/trips/start", {
        vehicle_id: Number(startForm.vehicle_id),
        driver_id: Number(startForm.driver_id),
        trip_date: startForm.trip_date,
        start_km: startForm.start_km,
      });
      setShowStart(false);
      load();
    } catch (err) {
      setError(err.message || "Could not start trip.");
    } finally {
      setSaving(false);
    }
  }

  function openEnd(trip) {
    setEndingTrip(trip);
    setEndKm(trip.start_km);
    setError("");
  }

  async function handleEnd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post(`/admin/delivery/trips/${endingTrip.id}/end`, { end_km: endKm });
      setEndingTrip(null);
      load();
    } catch (err) {
      setError(err.message || "Could not end trip.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Trips</h1>
        <button className="btn btn-sm btn-primary" onClick={openStart}>+ Start Trip</button>
      </div>

      <div className="form-group" style={{ maxWidth: 200, marginBottom: 16 }}>
        <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {!trips ? (
        <Loading />
      ) : trips.length === 0 ? (
        <Empty>No trips yet.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Trip #</th><th>Date</th><th>Vehicle</th><th>Driver</th><th>Start KM</th><th>End KM</th><th>Total KM</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id}>
                  <td>{t.trip_number}</td>
                  <td>{new Date(t.trip_date).toLocaleDateString()}</td>
                  <td>{t.vehicle?.registration_number}</td>
                  <td>{t.driver?.name}</td>
                  <td>{t.start_km}</td>
                  <td>{t.end_km ?? "-"}</td>
                  <td>{t.total_km ?? "-"}</td>
                  <td><span className={`badge ${tripStatusBadgeClass(t.status)}`}>{t.status}</span></td>
                  <td>
                    {t.status === "Ongoing" && (
                      <button className="btn btn-sm btn-primary" onClick={() => openEnd(t)}>End Trip</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showStart && (
        <div className="modal-overlay" onClick={() => !saving && setShowStart(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowStart(false)}>&times;</button>
            <h3 style={{ marginTop: 0 }}>Start Trip</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleStart}>
              <div className="form-group">
                <label>Vehicle</label>
                <select className="form-control" required value={startForm.vehicle_id} onChange={(e) => {
                  const vehicle = vehicles.find((v) => v.id === Number(e.target.value));
                  setStartForm((f) => ({ ...f, vehicle_id: e.target.value, start_km: vehicle?.current_km_reading || 0 }));
                }}>
                  <option value="">Select vehicle...</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number} ({v.current_km_reading} km)</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Driver</label>
                <select className="form-control" required value={startForm.driver_id} onChange={(e) => setStartForm((f) => ({ ...f, driver_id: e.target.value }))}>
                  <option value="">Select driver...</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" className="form-control" required value={startForm.trip_date} onChange={(e) => setStartForm((f) => ({ ...f, trip_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Starting KM Reading</label>
                <input type="number" className="form-control" required value={startForm.start_km} onChange={(e) => setStartForm((f) => ({ ...f, start_km: e.target.valueAsNumber || 0 }))} />
              </div>
              <button className="btn btn-primary btn-block" disabled={saving}>{saving ? "Starting..." : "Start Trip"}</button>
            </form>
          </div>
        </div>
      )}

      {endingTrip && (
        <div className="modal-overlay" onClick={() => !saving && setEndingTrip(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setEndingTrip(null)}>&times;</button>
            <h3 style={{ marginTop: 0 }}>End Trip -- {endingTrip.trip_number}</h3>
            <p style={{ color: "var(--color-text-muted)" }}>Starting KM: {endingTrip.start_km}</p>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleEnd}>
              <div className="form-group">
                <label>Ending KM Reading</label>
                <input type="number" className="form-control" required value={endKm} onChange={(e) => setEndKm(e.target.valueAsNumber || 0)} />
              </div>
              <button className="btn btn-primary btn-block" disabled={saving}>{saving ? "Ending..." : "End Trip"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
