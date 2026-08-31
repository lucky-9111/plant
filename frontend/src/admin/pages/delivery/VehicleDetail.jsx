import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";
import { vehicleStatusBadgeClass, tripStatusBadgeClass } from "../../delivery/deliveryStatus";

export default function VehicleDetail() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [trips, setTrips] = useState(null);
  const [fuelLogs, setFuelLogs] = useState(null);
  const [error, setError] = useState("");

  function load() {
    setVehicle(null);
    setError("");
    api.get(`/admin/delivery/vehicles/${id}`).then(setVehicle).catch((err) => setError(err.message || "Could not load this vehicle."));
    api.get(`/admin/delivery/trips?vehicle_id=${id}`).then(setTrips);
    api.get(`/admin/delivery/fuel?vehicle_id=${id}`).then(setFuelLogs);
  }

  useEffect(load, [id]);

  if (error && !vehicle) return <div className="alert alert-error">{error}</div>;
  if (!vehicle) return <Loading />;

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>{vehicle.registration_number}</h1>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`badge ${vehicleStatusBadgeClass(vehicle.status)}`}>{vehicle.status}</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{vehicle.name_model}</span>
          </span>
        </div>
        <Link className="btn btn-sm btn-outline dark" to="/admin/delivery/vehicles">
          &larr; Back to Vehicles
        </Link>
      </div>

      <div className="stat-cards" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="num">{vehicle.current_km_reading.toLocaleString()}</div><div className="label">Current KM</div></div>
        <div className="stat-card"><div className="num">{vehicle.total_trips}</div><div className="label">Total Trips</div></div>
        <div className="stat-card"><div className="num">{vehicle.total_deliveries}</div><div className="label">Total Deliveries</div></div>
        <div className="stat-card"><div className="num">{vehicle.total_km.toLocaleString()}</div><div className="label">Total KM</div></div>
        <div className="stat-card"><div className="num">{vehicle.total_fuel_litres.toLocaleString()} L</div><div className="label">Total Fuel</div></div>
        <div className="stat-card"><div className="num">₹{vehicle.total_fuel_cost.toLocaleString()}</div><div className="label">Fuel Cost</div></div>
        <div className="stat-card">
          <div className="num">{vehicle.avg_km_per_litre != null ? vehicle.avg_km_per_litre : "-"}</div>
          <div className="label">Avg KM/L</div>
        </div>
      </div>

      <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Trip History</h2>
        {!trips ? (
          <Loading />
        ) : trips.length === 0 ? (
          <Empty>No trips yet.</Empty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Trip #</th><th>Date</th><th>Driver</th><th>Start KM</th><th>End KM</th><th>Total KM</th><th>Deliveries</th><th>Status</th></tr></thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t.id}>
                    <td>{t.trip_number}</td>
                    <td>{new Date(t.trip_date).toLocaleDateString()}</td>
                    <td>{t.driver?.name || "-"}</td>
                    <td>{t.start_km}</td>
                    <td>{t.end_km ?? "-"}</td>
                    <td>{t.total_km ?? "-"}</td>
                    <td>{t.delivery_count}</td>
                    <td><span className={`badge ${tripStatusBadgeClass(t.status)}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-form-card" style={{ maxWidth: "none" }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Fuel History</h2>
        {!fuelLogs ? (
          <Loading />
        ) : fuelLogs.length === 0 ? (
          <Empty>No fuel records yet.</Empty>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Date</th><th>Litres</th><th>Rate</th><th>Amount</th><th>Odometer</th></tr></thead>
              <tbody>
                {fuelLogs.map((f) => (
                  <tr key={f.id}>
                    <td>{new Date(f.date).toLocaleDateString()}</td>
                    <td>{f.litres}</td>
                    <td>₹{f.rate_per_litre}</td>
                    <td>₹{f.total_amount.toLocaleString()}</td>
                    <td>{f.odometer_reading ?? "-"}</td>
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
