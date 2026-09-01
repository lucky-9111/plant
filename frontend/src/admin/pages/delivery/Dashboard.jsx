import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";
import KpiCard from "../../analytics/KpiCard";
import { deliveryStatusBadgeClass } from "../../delivery/deliveryStatus";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function DeliveryDashboard() {
  const [date, setDate] = useState(todayDateInput());
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [deliveries, setDeliveries] = useState(null);
  const [deliveriesError, setDeliveriesError] = useState("");

  function loadSummary() {
    setSummary(null);
    setSummaryError("");
    api.get(`/admin/delivery/deliveries/dashboard?date=${date}`).then(setSummary).catch((err) => setSummaryError(err.message || "Could not load dashboard summary."));
  }

  function loadDeliveries() {
    setDeliveries(null);
    setDeliveriesError("");
    api.get(`/admin/delivery/deliveries?date_from=${date}&date_to=${date}`).then(setDeliveries).catch((err) => setDeliveriesError(err.message || "Could not load deliveries."));
  }

  useEffect(() => {
    loadSummary();
    loadDeliveries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div>
      <div className="admin-page-head">
        <h1>Delivery Dashboard</h1>
        <input type="date" className="form-control" style={{ maxWidth: 180 }} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {summaryError ? (
        <div className="alert alert-error">
          {summaryError} <button type="button" className="btn btn-outline dark" onClick={loadSummary}>Retry</button>
        </div>
      ) : !summary ? (
        <Loading />
      ) : (
        <div className="stat-cards" style={{ marginBottom: 28 }}>
          <KpiCard label="Total Deliveries" value={summary.total_deliveries} sublabel={summary.date_label} />
          <KpiCard label="Vehicles On Route" value={summary.vehicles_on_route} />
          <KpiCard label="Completed" value={summary.completed} />
          <KpiCard label="Pending" value={summary.pending} />
          <KpiCard label="Cancelled" value={summary.cancelled} />
          <KpiCard label="Total Quantity" value={summary.total_quantity} />
          <KpiCard label="Total KM" value={`${summary.total_km} km`} />
          <KpiCard label="Fuel Used" value={`${summary.fuel_used_litres} L`} />
        </div>
      )}

      <div className="admin-page-head">
        <h2 style={{ fontSize: "1.1rem" }}>Deliveries for this date</h2>
        <Link className="btn btn-sm btn-primary" to="/admin/delivery/deliveries/new">
          + New Delivery
        </Link>
      </div>

      {deliveriesError ? (
        <div className="alert alert-error">
          {deliveriesError} <button type="button" className="btn btn-outline dark" onClick={loadDeliveries}>Retry</button>
        </div>
      ) : !deliveries ? (
        <Loading />
      ) : deliveries.length === 0 ? (
        <Empty>No deliveries scheduled for this date.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Delivery</th><th>Customer</th><th>Driver</th><th>Vehicle</th><th>Quantity</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td>{d.delivery_number}</td>
                  <td>{d.contact?.name || "-"}</td>
                  <td>{d.driver?.name || "-"}</td>
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
  );
}
