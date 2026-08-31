import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../api";
import { Loading } from "../../../components/Loading";
import { deliveryStatusBadgeClass } from "../../delivery/deliveryStatus";

const STATUSES = ["Assigned", "Ready", "Out for Delivery", "Arrived"];
const TERMINAL = ["Delivered", "Partially Delivered", "Failed", "Cancelled"];

export default function DeliveryDetail() {
  const { id } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [error, setError] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assignForm, setAssignForm] = useState({ driver_id: "", vehicle_id: "" });
  const [showComplete, setShowComplete] = useState(false);
  const [completeItems, setCompleteItems] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setDelivery(null);
    setError("");
    api
      .get(`/admin/delivery/deliveries/${id}`)
      .then((d) => {
        setDelivery(d);
        setAssignForm({ driver_id: d.driver_id || "", vehicle_id: d.vehicle_id || "" });
        setCompleteItems(d.items.map((i) => ({ item_id: i.id, delivered_quantity: i.ordered_quantity })));
      })
      .catch((err) => setError(err.message || "Could not load this delivery."));
    api.get("/admin/delivery/drivers?status=Active").then(setDrivers);
    api.get("/admin/delivery/vehicles").then(setVehicles);
  }

  useEffect(load, [id]);

  async function handleAssign(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/admin/delivery/deliveries/${id}/assign`, {
        driver_id: assignForm.driver_id ? Number(assignForm.driver_id) : null,
        vehicle_id: assignForm.vehicle_id ? Number(assignForm.vehicle_id) : null,
      });
      load();
    } catch (err) {
      alert(err.message || "Could not assign driver/vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate(status) {
    setSaving(true);
    try {
      await api.put(`/admin/delivery/deliveries/${id}/status`, { status });
      load();
    } catch (err) {
      alert(err.message || "Could not update status.");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/admin/delivery/deliveries/${id}/complete`, { items: completeItems, remarks });
      setShowComplete(false);
      load();
    } catch (err) {
      alert(err.message || "Could not complete this delivery.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !delivery) return <div className="alert alert-error">{error}</div>;
  if (!delivery) return <Loading />;

  const isTerminal = TERMINAL.includes(delivery.status);

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>{delivery.delivery_number}</h1>
          <span className={`badge ${deliveryStatusBadgeClass(delivery.status)}`}>{delivery.status}</span>
        </div>
        <Link className="btn btn-sm btn-outline dark" to="/admin/delivery/deliveries">
          &larr; Back to Deliveries
        </Link>
      </div>

      <div className="admin-order-detail-grid">
        <div>
          <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Items</h2>
            {delivery.items.map((item) => (
              <div key={item.id} className="admin-order-item-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{item.description}</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                    Ordered: {item.ordered_quantity} {item.unit}
                    {item.delivered_quantity != null && ` · Delivered: ${item.delivered_quantity}`}
                  </div>
                </div>
              </div>
            ))}
            <div className="cart-summary-row cart-summary-total" style={{ marginTop: 12 }}>
              <span>Total Quantity</span>
              <span>{delivery.total_quantity}</span>
            </div>
          </div>

          {delivery.notes && (
            <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Notes</h2>
              <p style={{ margin: 0 }}>{delivery.notes}</p>
            </div>
          )}

          {isTerminal && (delivery.delivery_remarks || delivery.proof_photo_url) && (
            <div className="admin-form-card" style={{ maxWidth: "none" }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Proof of Delivery</h2>
              {delivery.delivery_remarks && <p><strong>Remarks:</strong> {delivery.delivery_remarks}</p>}
              {delivery.proof_photo_url && <p><strong>Photo:</strong> {delivery.proof_photo_url}</p>}
            </div>
          )}
        </div>

        <div>
          <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Customer</h2>
            <p style={{ margin: 0 }}>{delivery.contact?.name}</p>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>{delivery.customer_mobile}</p>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>{delivery.delivery_address}</p>
          </div>

          {(delivery.sales_order_id || delivery.invoice_id) && (
            <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Related Documents</h2>
              {delivery.sales_order_id && (
                <p><Link className="btn btn-sm btn-outline dark" to={`/admin/accounting/sales-orders/${delivery.sales_order_id}`}>View Sales Order</Link></p>
              )}
              {delivery.invoice_id && (
                <p><Link className="btn btn-sm btn-outline dark" to={`/admin/accounting/invoices/${delivery.invoice_id}`}>View Invoice</Link></p>
              )}
            </div>
          )}

          {!isTerminal && (
            <form className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }} onSubmit={handleAssign}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Driver / Vehicle</h2>
              <div className="form-group">
                <label>Driver</label>
                <select className="form-control" value={assignForm.driver_id} onChange={(e) => setAssignForm((f) => ({ ...f, driver_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Vehicle</label>
                <select className="form-control" value={assignForm.vehicle_id} onChange={(e) => setAssignForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-block" disabled={saving}>Save Assignment</button>
            </form>
          )}

          {!isTerminal && (
            <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Update Status</h2>
              <div className="row-actions" style={{ flexWrap: "wrap" }}>
                {STATUSES.map((s) => (
                  <button key={s} type="button" className="btn btn-sm btn-outline dark" disabled={saving || s === delivery.status} onClick={() => handleStatusUpdate(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isTerminal && (
            <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
              <button type="button" className="btn btn-primary btn-block" onClick={() => setShowComplete(true)}>
                Mark Delivered / Complete
              </button>
            </div>
          )}

          {!isTerminal && (
            <div className="admin-form-card" style={{ maxWidth: "none" }}>
              <button type="button" className="btn btn-danger btn-block" disabled={saving} onClick={() => handleStatusUpdate("Cancelled")}>
                Cancel Delivery
              </button>
            </div>
          )}
        </div>
      </div>

      {showComplete && (
        <div className="modal-overlay" onClick={() => !saving && setShowComplete(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setShowComplete(false)}>&times;</button>
            <h3 style={{ marginTop: 0 }}>Confirm Delivery</h3>
            <form onSubmit={handleComplete}>
              {delivery.items.map((item, i) => (
                <div className="form-group" key={item.id}>
                  <label>{item.description} (Ordered: {item.ordered_quantity})</label>
                  <input
                    type="number"
                    className="form-control"
                    value={completeItems[i]?.delivered_quantity ?? item.ordered_quantity}
                    onChange={(e) => {
                      const value = e.target.valueAsNumber || 0;
                      setCompleteItems((prev) => prev.map((c, idx) => (idx === i ? { ...c, delivered_quantity: value } : c)));
                    }}
                  />
                </div>
              ))}
              <div className="form-group">
                <label>Remarks</label>
                <textarea className="form-control" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-block" disabled={saving}>
                {saving ? "Saving..." : "Confirm Delivery"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
