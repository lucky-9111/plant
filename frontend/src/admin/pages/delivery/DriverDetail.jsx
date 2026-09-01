import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";
import { driverStatusBadgeClass, deliveryStatusBadgeClass, tripStatusBadgeClass } from "../../delivery/deliveryStatus";

export default function DriverDetail() {
  const { id } = useParams();
  const [driver, setDriver] = useState(null);
  const [deliveries, setDeliveries] = useState(null);
  const [trips, setTrips] = useState(null);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function load() {
    setDriver(null);
    setError("");
    api.get(`/admin/delivery/drivers/${id}`).then(setDriver).catch((err) => setError(err.message || "Could not load this driver."));
  }

  useEffect(load, [id]);

  useEffect(() => {
    setDeliveries(null);
    const params = new URLSearchParams({ driver_id: id });
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    api.get(`/admin/delivery/deliveries?${params.toString()}`).then(setDeliveries);

    setTrips(null);
    const tripParams = new URLSearchParams({ driver_id: id });
    if (dateFrom) tripParams.set("date_from", dateFrom);
    if (dateTo) tripParams.set("date_to", dateTo);
    api.get(`/admin/delivery/trips?${tripParams.toString()}`).then(setTrips);
  }, [id, dateFrom, dateTo]);

  if (error && !driver) return <div className="alert alert-error">{error}</div>;
  if (!driver) return <Loading />;

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>{driver.name}</h1>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`badge ${driverStatusBadgeClass(driver.status)}`}>{driver.status}</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{driver.phone}</span>
          </span>
        </div>
        <Link className="btn btn-sm btn-outline dark" to="/admin/delivery/drivers">
          &larr; Back to Drivers
        </Link>
      </div>

      <div className="stat-cards" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="num">{driver.total_deliveries}</div><div className="label">Total Deliveries</div></div>
        <div className="stat-card"><div className="num">{driver.total_trips}</div><div className="label">Total Trips</div></div>
        <div className="stat-card"><div className="num">{driver.total_km.toLocaleString()}</div><div className="label">Total KM</div></div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>Filter history by date:</label>
        <input type="date" className="form-control" style={{ maxWidth: 160 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span>to</span>
        <input type="date" className="form-control" style={{ maxWidth: 160 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        {(dateFrom || dateTo) && (
          <button className="btn btn-sm btn-outline dark" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</button>
        )}
      </div>

      <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Delivery History</h2>
        {!deliveries ? (
          <Loading />
        ) : deliveries.length === 0 ? (
          <Empty>No deliveries for this filter.</Empty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Delivery</th><th>Date</th><th>Customer</th><th>Vehicle</th><th>Quantity</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td>{d.delivery_number}</td>
                    <td>{new Date(d.delivery_date).toLocaleDateString()}</td>
                    <td>{d.contact?.name || "-"}</td>
                    <td>{d.vehicle?.registration_number || "-"}</td>
                    <td>{d.total_quantity}</td>
                    <td><span className={`badge ${deliveryStatusBadgeClass(d.status)}`}>{d.status}</span></td>
                    <td><Link className="btn btn-sm btn-outline dark" to={`/admin/delivery/deliveries/${d.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-form-card" style={{ maxWidth: "none" }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Trip History</h2>
        {!trips ? (
          <Loading />
        ) : trips.length === 0 ? (
          <Empty>No trips for this filter.</Empty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Trip #</th><th>Date</th><th>Vehicle</th><th>Start KM</th><th>End KM</th><th>Total KM</th><th>Status</th></tr></thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td>{t.trip_number}</td>
                    <td>{new Date(t.trip_date).toLocaleDateString()}</td>
                    <td>{t.vehicle?.registration_number || "-"}</td>
                    <td>{t.start_km}</td>
                    <td>{t.end_km ?? "-"}</td>
                    <td>{t.total_km ?? "-"}</td>
                    <td><span className={`badge ${tripStatusBadgeClass(t.status)}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
