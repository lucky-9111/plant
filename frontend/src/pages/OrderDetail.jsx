import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { Loading, Empty } from "../components/Loading";
import OrderTracker from "../components/OrderTracker";
import CancelOrderModal from "../components/CancelOrderModal";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { CANCELLABLE_STATUSES, paymentBadgeClass, statusLabel } from "../utils/orderStatus";

export default function OrderDetail() {
  const { id } = useParams();
  useDocumentTitle(`Order #${id} | Aaiji Nursery`);
  const { session } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const cancelSubmittingRef = useRef(false);

  function load() {
    setOrder(null);
    setError("");
    api
      .get(`/customer/orders/${id}`)
      .then(setOrder)
      .catch((err) =>
        setError(err.status === 404 ? "Order not found." : err.message || "Could not load this order.")
      );
  }

  useEffect(() => {
    if (session?.type === "customer") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  if (session === undefined) return <Loading />;
  if (session === null)
    return (
      <Navigate
        to="/login"
        state={{ from: `/orders/${id}`, backgroundLocation: { pathname: "/" } }}
        replace
      />
    );
  if (session.type !== "customer") return <Navigate to="/" replace />;

  async function handleCancel(remarks) {
    if (cancelSubmittingRef.current) return;
    cancelSubmittingRef.current = true;
    setCancelling(true);
    setCancelError("");
    try {
      await api.post(`/customer/orders/${id}/cancel`, { remarks });
      setShowCancelModal(false);
      load();
    } catch (err) {
      setCancelError(err.message || "Unable to cancel this order. Please try again.");
    } finally {
      cancelSubmittingRef.current = false;
      setCancelling(false);
    }
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Order Details</h1>
          <p>Track and review this order.</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <Link
            to="/orders"
            className="btn btn-sm btn-outline dark"
            style={{ marginBottom: 20, display: "inline-block" }}
          >
            &larr; Back to My Orders
          </Link>

          {error ? (
            <Empty>{error}</Empty>
          ) : !order ? (
            <Loading />
          ) : (
            <>
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-body">
                  <div className="orders-row-body" style={{ marginBottom: 0 }}>
                    <div>
                      <div className="orders-row-id">Order #{order.id}</div>
                      <div className="orders-row-date">
                        Placed on {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="badge badge-muted">{statusLabel(order.status)}</span>
                  </div>

                  <OrderTracker status={order.status} />

                  {CANCELLABLE_STATUSES.includes(order.status) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      style={{ marginTop: 20 }}
                      disabled={cancelling}
                      onClick={() => setShowCancelModal(true)}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>

              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-body">
                  <h3 style={{ marginTop: 0 }}>Products</h3>
                  {order.items.map((item) => (
                    <div key={item.id} className="cart-summary-row">
                      <span>
                        {item.plant_name} &times; {item.quantity} (&#8377;{item.unit_price} each)
                      </span>
                      <span>&#8377;{item.line_total}</span>
                    </div>
                  ))}
                  <div className="cart-summary-row">
                    <span>Subtotal</span>
                    <span>&#8377;{order.subtotal}</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Shipping</span>
                    <span>&#8377;{order.shipping_fee}</span>
                  </div>
                  <div className="cart-summary-row cart-summary-total">
                    <span>Total</span>
                    <span>&#8377;{order.total_amount}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="card">
                  <div className="card-body">
                    <h3 style={{ marginTop: 0 }}>Delivery Address</h3>
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
                </div>

                <div className="card">
                  <div className="card-body">
                    <h3 style={{ marginTop: 0 }}>Payment</h3>
                    <p style={{ margin: "0 0 8px" }}>
                      Method: <strong>{order.payment_method}</strong>
                    </p>
                    <span className={`badge ${paymentBadgeClass(order.payment_status)}`}>
                      {order.payment_status}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {showCancelModal && (
        <CancelOrderModal
          orderId={order?.id}
          submitting={cancelling}
          error={cancelError}
          onClose={() => {
            setShowCancelModal(false);
            setCancelError("");
          }}
          onConfirm={handleCancel}
        />
      )}
    </>
  );
}
