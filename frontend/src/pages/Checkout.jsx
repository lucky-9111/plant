import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Loading, Empty } from "../components/Loading";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const MOBILE_PATTERN = /^[6-9]\d{9}$/;

function OrderConfirmation({ order }) {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: "center" }}>
            <div
              className="badge badge-accent"
              style={{ fontSize: "0.9rem", padding: "8px 18px", marginBottom: 18 }}
            >
              Order Placed
            </div>
            <h2 style={{ marginBottom: 8 }}>Thank you, {order.delivery_name}!</h2>
            <p style={{ color: "var(--color-text-muted)" }}>
              Your order #{order.id} has been placed successfully and will be paid for via{" "}
              <strong>Cash on Delivery</strong>. Current status: <strong>{order.status}</strong>.
            </p>

            <div style={{ textAlign: "left", marginTop: 24 }}>
              {order.items.map((item) => (
                <div key={item.id} className="cart-summary-row">
                  <span>
                    {item.plant_name} &times; {item.quantity}
                  </span>
                  <span>&#8377;{item.line_total}</span>
                </div>
              ))}
              <div className="cart-summary-row cart-summary-total">
                <span>Total</span>
                <span>&#8377;{order.total_amount}</span>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/plants" className="btn btn-primary">
                Continue Shopping
              </Link>
              <Link to="/" className="btn btn-outline dark">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Checkout() {
  useDocumentTitle("Checkout | Aaiji Nursery");
  const { session } = useAuth();
  const location = useLocation();
  const { items: cartItems, loading: cartLoading, refreshCart } = useCart();

  const buyNowRequest = location.state?.buyNow || null;
  const [buyNowPlant, setBuyNowPlant] = useState(null);
  const [buyNowError, setBuyNowError] = useState("");
  const [loadingBuyNowPlant, setLoadingBuyNowPlant] = useState(Boolean(buyNowRequest));

  const [form, setForm] = useState({
    delivery_name: "",
    delivery_mobile: "",
    delivery_line1: "",
    delivery_line2: "",
    delivery_city: "",
    delivery_state: "",
    delivery_pincode: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  useEffect(() => {
    if (session?.type !== "customer") return;
    api
      .get("/customer/addresses")
      .then((data) => {
        setAddresses(data);
        const preferred = data.find((a) => a.is_default) || data[0];
        if (preferred) applyAddress(preferred);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function applyAddress(address) {
    setSelectedAddressId(address.id);
    setForm({
      delivery_name: address.full_name,
      delivery_mobile: address.mobile,
      delivery_line1: address.line1,
      delivery_line2: address.line2,
      delivery_city: address.city,
      delivery_state: address.state,
      delivery_pincode: address.pincode,
    });
  }

  function useNewAddress() {
    setSelectedAddressId(null);
    setForm({
      delivery_name: "",
      delivery_mobile: "",
      delivery_line1: "",
      delivery_line2: "",
      delivery_city: "",
      delivery_state: "",
      delivery_pincode: "",
    });
  }

  useEffect(() => {
    if (!buyNowRequest?.slug) return;
    setLoadingBuyNowPlant(true);
    api
      .get(`/plants/${buyNowRequest.slug}`)
      .then(setBuyNowPlant)
      .catch(() => setBuyNowError("This product is no longer available."))
      .finally(() => setLoadingBuyNowPlant(false));
  }, [buyNowRequest?.slug]);

  if (session === undefined) return <Loading />;
  if (session === null) return <Navigate to="/login" state={{ from: "/checkout" }} replace />;
  if (session.type !== "customer") return <Navigate to="/" replace />;

  const isBuyNow = Boolean(buyNowRequest);
  const lines = isBuyNow
    ? buyNowPlant
      ? [{ plant: buyNowPlant, quantity: buyNowRequest.quantity }]
      : []
    : cartItems.map((item) => ({ plant: item.plant, quantity: item.quantity }));

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + (l.plant?.effective_price ?? 0) * l.quantity, 0);

  const buyNowUnavailable =
    isBuyNow &&
    buyNowPlant &&
    (buyNowPlant.stock_quantity <= 0 || buyNowPlant.stock_quantity < buyNowRequest.quantity);

  function update(field, value) {
    setSelectedAddressId(null);
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const mobile = form.delivery_mobile.trim();
    if (!MOBILE_PATTERN.test(mobile)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = { ...form, delivery_mobile: mobile, payment_method: "COD" };
      if (isBuyNow) {
        payload.buy_now_plant_id = buyNowRequest.plantId;
        payload.buy_now_quantity = buyNowRequest.quantity;
      }
      const order = await api.post("/customer/checkout", payload);
      setPlacedOrder(order);
      if (!isBuyNow) refreshCart();
    } catch (err) {
      setError(err.message || "Could not place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (placedOrder) return <OrderConfirmation order={placedOrder} />;

  if (isBuyNow && loadingBuyNowPlant) return <Loading />;

  if (isBuyNow && (buyNowError || !buyNowPlant)) {
    return (
      <div className="section container">
        <Empty>{buyNowError || "This product is no longer available."}</Empty>
        <div style={{ textAlign: "center" }}>
          <Link to="/plants" className="btn btn-primary">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  if (!isBuyNow && !cartLoading && cartItems.length === 0) {
    return (
      <div className="section container">
        <Empty>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text)" }}>
            Your cart is empty
          </p>
          <Link to="/plants" className="btn btn-primary" style={{ marginTop: 16 }}>
            Continue Shopping
          </Link>
        </Empty>
      </div>
    );
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Checkout</h1>
          <p>{isBuyNow ? "Complete your purchase." : "Review your order and enter delivery details."}</p>
        </div>
      </section>

      <section className="section">
        <div className="container cart-layout">
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>Delivery Details</h3>

              {addresses.length > 0 && (
                <div className="form-group">
                  <label>Choose a Saved Address</label>
                  <div className="checkout-address-list">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`checkout-address-option ${selectedAddressId === address.id ? "checkout-address-option-active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="saved_address"
                          checked={selectedAddressId === address.id}
                          onChange={() => applyAddress(address)}
                        />
                        <span>
                          <strong>{address.address_type}</strong> &mdash; {address.full_name}, {address.line1}, {address.city}, {address.state} - {address.pincode}
                        </span>
                      </label>
                    ))}
                    <label className={`checkout-address-option ${selectedAddressId === null ? "checkout-address-option-active" : ""}`}>
                      <input
                        type="radio"
                        name="saved_address"
                        checked={selectedAddressId === null}
                        onChange={useNewAddress}
                      />
                      <span>Enter a new address</span>
                    </label>
                  </div>
                </div>
              )}

              {error && <div className="alert alert-error">{error}</div>}

              {buyNowUnavailable && (
                <div className="alert alert-error">
                  Only {buyNowPlant.stock_quantity} of {buyNowPlant.name} left in stock.
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="delivery_name">Full Name</label>
                    <input
                      id="delivery_name"
                      className="form-control"
                      required
                      value={form.delivery_name}
                      onChange={(e) => update("delivery_name", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="delivery_mobile">Mobile Number</label>
                    <input
                      id="delivery_mobile"
                      className="form-control"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      required
                      value={form.delivery_mobile}
                      onChange={(e) => update("delivery_mobile", e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="delivery_line1">Address Line 1</label>
                  <input
                    id="delivery_line1"
                    className="form-control"
                    required
                    value={form.delivery_line1}
                    onChange={(e) => update("delivery_line1", e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="delivery_line2">Address Line 2 (optional)</label>
                  <input
                    id="delivery_line2"
                    className="form-control"
                    value={form.delivery_line2}
                    onChange={(e) => update("delivery_line2", e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="delivery_city">City</label>
                    <input
                      id="delivery_city"
                      className="form-control"
                      required
                      value={form.delivery_city}
                      onChange={(e) => update("delivery_city", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="delivery_state">State</label>
                    <input
                      id="delivery_state"
                      className="form-control"
                      required
                      value={form.delivery_state}
                      onChange={(e) => update("delivery_state", e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="delivery_pincode">Pincode</label>
                  <input
                    id="delivery_pincode"
                    className="form-control"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={form.delivery_pincode}
                    onChange={(e) => update("delivery_pincode", e.target.value.replace(/\D/g, ""))}
                  />
                </div>

                <div className="form-group">
                  <label>Payment Method</label>
                  <div className="checkbox-row">
                    <input type="radio" id="pm_cod" checked readOnly />
                    <label htmlFor="pm_cod" style={{ margin: 0, fontWeight: 600 }}>
                      Cash on Delivery
                    </label>
                  </div>
                  <div className="checkbox-row" style={{ opacity: 0.5, marginTop: 8 }}>
                    <input type="radio" id="pm_online" disabled />
                    <label htmlFor="pm_online" style={{ margin: 0 }}>
                      Online Payment (Razorpay) &mdash; Coming Soon
                    </label>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-block"
                  disabled={submitting || buyNowUnavailable || lines.length === 0}
                >
                  {submitting ? "Placing Order..." : "Place Order"}
                </button>
              </form>
            </div>
          </div>

          <aside className="cart-summary card">
            <div className="card-body">
              <h3 style={{ marginBottom: 16 }}>Order Summary</h3>
              {lines.map((line, idx) => (
                <div className="cart-summary-row" key={line.plant?.id ?? idx}>
                  <span>
                    {line.plant?.name} &times; {line.quantity}
                  </span>
                  <span>&#8377;{(line.plant?.effective_price ?? 0) * line.quantity}</span>
                </div>
              ))}
              <div className="cart-summary-row">
                <span>Total Items</span>
                <span>{itemCount}</span>
              </div>
              <div className="cart-summary-row cart-summary-total">
                <span>Total</span>
                <span>&#8377;{subtotal}</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
