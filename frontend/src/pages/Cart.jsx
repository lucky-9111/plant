import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Loading, Empty } from "../components/Loading";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

function CartRow({ item, onUpdateQuantity, onRemove }) {
  const [busy, setBusy] = useState(false);
  const plant = item.plant;
  const price = plant?.effective_price ?? 0;
  const lineTotal = price * item.quantity;
  const atMaxStock = plant ? item.quantity >= plant.stock_quantity : false;

  async function changeQuantity(next) {
    if (next < 1 || busy) return;
    setBusy(true);
    try {
      await onUpdateQuantity(item.id, next);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (busy) return;
    setBusy(true);
    try {
      await onRemove(item.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cart-row">
      <Link to={plant ? `/plants/${plant.slug}` : "#"} className="cart-row-image">
        <img src={plant?.image_url} alt={plant?.name || "Plant"} />
      </Link>

      <div className="cart-row-info">
        <Link to={plant ? `/plants/${plant.slug}` : "#"} className="cart-row-name">
          {plant?.name || "Unavailable product"}
        </Link>
        <div className="cart-row-price">
          &#8377;{price} &times; {item.quantity} = &#8377;{lineTotal}
        </div>
        {plant && plant.stock_quantity <= 0 && (
          <span className="badge badge-gold" style={{ marginTop: 6 }}>
            Out of Stock
          </span>
        )}
      </div>

      <div className="cart-row-qty">
        <button
          type="button"
          className="qty-btn"
          onClick={() => changeQuantity(item.quantity - 1)}
          disabled={busy || item.quantity <= 1}
          aria-label={`Decrease quantity of ${plant?.name || "item"}`}
        >
          &minus;
        </button>
        <span className="qty-value">{item.quantity}</span>
        <button
          type="button"
          className="qty-btn"
          onClick={() => changeQuantity(item.quantity + 1)}
          disabled={busy || atMaxStock}
          aria-label={`Increase quantity of ${plant?.name || "item"}`}
        >
          +
        </button>
      </div>

      <div className="cart-row-subtotal">&#8377;{lineTotal}</div>

      <button
        type="button"
        className="cart-row-remove"
        onClick={handleRemove}
        disabled={busy}
        aria-label={`Remove ${plant?.name || "item"} from cart`}
        title="Remove"
      >
        &times;
      </button>
    </div>
  );
}

export default function Cart() {
  useDocumentTitle("My Cart | Aaiji Nursery");
  const { session } = useAuth();
  const { items, loading, updateQuantity, removeItem } = useCart();

  if (session === undefined) return <Loading />;
  if (session === null) return <Navigate to="/login" state={{ from: "/cart" }} replace />;
  if (session.type !== "customer") return <Navigate to="/" replace />;

  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = items.reduce((sum, it) => sum + (it.plant?.effective_price ?? 0) * it.quantity, 0);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>My Cart</h1>
          <p>Review your items before checkout.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <Loading />
          ) : items.length === 0 ? (
            <Empty>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text)" }}>
                Your cart is empty
              </p>
              <Link to="/plants" className="btn btn-primary" style={{ marginTop: 16 }}>
                Continue Shopping
              </Link>
            </Empty>
          ) : (
            <div className="cart-layout">
              <div className="cart-items">
                {items.map((item) => (
                  <CartRow
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeItem}
                  />
                ))}
              </div>

              <aside className="cart-summary card">
                <div className="card-body">
                  <h3 style={{ marginBottom: 16 }}>Order Summary</h3>
                  <div className="cart-summary-row">
                    <span>Total Items</span>
                    <span>{itemCount}</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Subtotal</span>
                    <span>&#8377;{subtotal}</span>
                  </div>
                  <div className="cart-summary-row cart-summary-total">
                    <span>Total</span>
                    <span>&#8377;{subtotal}</span>
                  </div>
                  <Link to="/checkout" className="btn btn-primary btn-block" style={{ marginTop: 18 }}>
                    Proceed to Checkout
                  </Link>
                  <Link to="/plants" className="btn btn-outline dark btn-block" style={{ marginTop: 10 }}>
                    Continue Shopping
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
