import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";
import SearchBox from "../../accounting/SearchBox";
import { deliveryStatusBadgeClass } from "../../delivery/deliveryStatus";

const STATUSES = ["Assigned", "Ready", "Out for Delivery", "Arrived", "Delivered", "Partially Delivered", "Failed", "Cancelled"];

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function Deliveries() {
  const [items, setItems] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loadError, setLoadError] = useState("");

  function load() {
    setItems(null);
    setLoadError("");
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const query = params.toString() ? `?${params.toString()}` : "";
    api.get(`/admin/delivery/deliveries${query}`).then(setItems).catch((err) => setLoadError(err.message || "Could not load deliveries."));
  }

  useEffect(load, [dateFrom, dateTo, status, q]);

  function quickRange(days) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Delivery History</h1>
        <Link className="btn btn-sm btn-primary" to="/admin/delivery/deliveries/new">
          + New Delivery
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-sm btn-outline dark" onClick={() => { setDateFrom(todayDateInput()); setDateTo(todayDateInput()); }}>Today</button>
        <button className="btn btn-sm btn-outline dark" onClick={() => quickRange(7)}>This Week</button>
        <button className="btn btn-sm btn-outline dark" onClick={() => quickRange(30)}>This Month</button>
        <button className="btn btn-sm btn-outline dark" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear Dates</button>
        <input type="date" className="form-control" style={{ maxWidth: 160 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span>to</span>
        <input type="date" className="form-control" style={{ maxWidth: 160 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <select className="form-control" style={{ maxWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <SearchBox value={q} onChange={setQ} placeholder="Search by delivery #, customer, mobile..." />
      </div>

      {loadError ? (
        <div className="alert alert-error">
          {loadError} <button type="button" className="btn btn-outline dark" onClick={load}>Retry</button>
        </div>
      ) : !items ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty>No deliveries found for this filter.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Delivery</th><th>Date</th><th>Customer</th><th>Driver</th><th>Vehicle</th><th>Quantity</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td>{d.delivery_number}</td>
                  <td>{new Date(d.delivery_date).toLocaleDateString()}</td>
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
