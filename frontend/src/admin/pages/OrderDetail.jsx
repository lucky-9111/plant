import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { Loading, Empty } from "../../components/Loading";
import OrderTracker from "../../components/OrderTracker";
import CancelOrderModal from "../../components/CancelOrderModal";
import {
  CANCELLABLE_STATUSES,
  TRACKER_STEPS,
  paymentBadgeClass,
  statusBadgeClass,
} from "../../utils/orderStatus";

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [confirmingStatus, setConfirmingStatus] = useState(null); // status pending confirmation
  const [updating, setUpdating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");

  function load() {
    setOrder(null);
    setError("");
    api
      .get(`/admin/orders/${id}`)
      .then((data) => {
        setOrder(data);
        setSelectedStatus(data.status);
      })
      .catch((err) => setError(err.message || "Could not load this order."));
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function confirmStatusUpdate() {
    setUpdating(true);
    setActionError("");
    try {
      await api.put(`/admin/orders/${id}/status`, { status: confirmingStatus });
      setConfirmingStatus(null);
      setToast(`Order status updated to ${confirmingStatus}`);
      load();
    } catch (err) {
      setActionError(err.message || "Unable to update order status. Please try again.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleCancel(remarks) {
    setCancelling(true);
    setActionError("");
    try {
      await api.post(`/admin/orders/${id}/cancel`, { remarks });
      setShowCancelModal(false);
      setToast("Order cancelled");
      load();
    } catch (err) {
      setActionError(err.message || "Unable to cancel this order. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const currentIndex = order ? TRACKER_STEPS.indexOf(order.status) : -1;
  const availableStatuses = TRACKER_STEPS.filter((s, i) => order && i > currentIndex);

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>Order {order ? `#${order.id}` : ""}</h1>
          {order && (
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`badge ${statusBadgeClass(order.status)}`}>{order.status}</span>
              <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                Placed {new Date(order.created_at).toLocaleString()}
              </span>
            </span>
          )}
        </div>
        <Link className="btn btn-sm btn-outline dark" to="/admin/orders">
          &larr; Back to Orders
        </Link>
      </div>

      {toast && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          {toast}
        </div>
      )}

      {error ? (
        <div className="alert alert-error">{error}</div>
      ) : !order ? (
        <Loading />
      ) : (
        <div className="admin-order-detail-grid">
          {/* Left / main column */}
          <div>
            <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Ordered Products</h2>
              {order.items.map((item) => (
                <div key={item.id} className="admin-order-item-row">
                  {item.plant_image_url ? (
                    <img className="admin-order-item-thumb" src={item.plant_image_url} alt={item.plant_name} />
                  ) : (
                    <div className="admin-order-item-thumb" />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{item.plant_name}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                      Qty {item.quantity} &times; &#8377;{item.unit_price}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>&#8377;{item.line_total}</div>
                </div>
              ))}

              <div className="cart-summary-row" style={{ marginTop: 12 }}>
                <span>Subtotal</span>
                <span>&#8377;{order.subtotal}</span>
              </div>
              <div className="cart-summary-row">
                <span>Shipping</span>
                <span>&#8377;{order.shipping_fee}</span>
              </div>
              <div className="cart-summary-row cart-summary-total">
                <span>Grand Total</span>
                <span>&#8377;{order.total_amount}</span>
              </div>
            </div>

            <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Status Timeline</h2>
              <OrderTracker status={order.status} />
            </div>

            <div className="admin-form-card" style={{ maxWidth: "none" }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Status History</h2>
              {order.history.length === 0 ? (
                <Empty>No status history yet.</Empty>
              ) : (
                <div className="admin-order-status-history">
                  {order.history.map((h) => (
                    <div key={h.id} className="admin-order-status-history-item">
                      <strong>{h.new_status}</strong>
                      <div className="meta">
                        {new Date(h.created_at).toLocaleString()} &middot; Updated by {h.updated_by || "system"}
                      </div>
                      {h.remarks && <div className="meta">{h.remarks}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right / sidebar column */}
          <div>
            <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Customer Information</h2>
              <div className="form-group">
                <label>Name</label>
                <div>{order.customer?.name || order.delivery_name || "-"}</div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <div>{order.customer?.email || "-"}</div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Phone</label>
                <div>{order.customer?.mobile || order.delivery_mobile || "-"}</div>
              </div>
            </div>

            <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Delivery Address</h2>
              <p style={{ margin: 0 }}>{order.delivery_name}</p>
              <p style={{ margin: 0 }}>{order.delivery_mobile}</p>
              <p style={{ margin: "8px 0 0" }}>
                {order.delivery_line1}
                {order.delivery_line2 ? `, ${order.delivery_line2}` : ""}
              </p>
              <p style={{ margin: 0 }}>
                {order.delivery_city}, {order.delivery_state} - {order.delivery_pincode}
              </p>
            </div>

            <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Payment</h2>
              <p style={{ margin: "0 0 8px" }}>
                Method: <strong>{order.payment_method}</strong>
              </p>
              <span className={`badge ${paymentBadgeClass(order.payment_status)}`}>
                {order.payment_status}
              </span>
            </div>

            <div className="admin-form-card" style={{ maxWidth: "none" }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Order Status Management</h2>

              {actionError && (
                <div className="alert alert-error" style={{ marginBottom: 14 }}>
                  {actionError}
                </div>
              )}

              <p style={{ margin: "0 0 14px" }}>
                Current Status: <strong>{order.status}</strong>
              </p>

              {availableStatuses.length > 0 ? (
                <>
                  <div className="form-group">
                    <label htmlFor="status-select">Update Status</label>
                    <select
                      id="status-select"
                      className="form-control"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value={order.status}>{order.status} (current)</option>
                      {availableStatuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    disabled={selectedStatus === order.status}
                    onClick={() => setConfirmingStatus(selectedStatus)}
                  >
                    Update Status
                  </button>
                </>
              ) : (
                <Empty>This order's status can no longer be changed.</Empty>
              )}

              {CANCELLABLE_STATUSES.includes(order.status) && (
                <button
                  type="button"
                  className="btn btn-danger btn-block"
                  style={{ marginTop: 12 }}
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmingStatus && (
        <div className="modal-overlay" onClick={() => !updating && setConfirmingStatus(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {!updating && (
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setConfirmingStatus(null)}
              >
                &times;
              </button>
            )}
            <h3 style={{ marginTop: 0 }}>Update Order Status?</h3>
            <p>
              Are you sure you want to change this order from <strong>{order.status}</strong> to{" "}
              <strong>{confirmingStatus}</strong>?
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-outline dark"
                style={{ flex: 1 }}
                disabled={updating}
                onClick={() => setConfirmingStatus(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={updating}
                onClick={confirmStatusUpdate}
              >
                {updating ? "Updating..." : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <CancelOrderModal
          orderId={order?.id}
          submitting={cancelling}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancel}
        />
      )}
    </div>
  );
}
