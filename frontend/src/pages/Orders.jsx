import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { Loading, Empty } from "../components/Loading";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const WARNING_STATUSES = ["Cancelled", "Returned", "Refund Initiated", "Refund Completed"];

function statusBadgeClass(status) {
  if (status === "Delivered") return "badge-accent";
  if (WARNING_STATUSES.includes(status)) return "badge-gold";
  return "badge-muted";
}

export default function Orders() {
  useDocumentTitle("My Orders | Aaiji Nursery");
  const { session } = useAuth();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    if (session?.type === "customer") {
      api
        .get("/customer/orders")
        .then(setOrders)
        .catch(() => setOrders([]));
    }
  }, [session]);

  if (session === undefined) return <Loading />;
  if (session === null) return <Navigate to="/login" state={{ from: "/orders" }} replace />;
  if (session.type !== "customer") return <Navigate to="/" replace />;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>My Orders</h1>
          <p>Track and review your past orders.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {!orders ? (
            <Loading />
          ) : orders.length === 0 ? (
            <Empty>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text)" }}>
                You haven't placed any orders yet
              </p>
              <Link to="/plants" className="btn btn-primary" style={{ marginTop: 16 }}>
                Start Shopping
              </Link>
            </Empty>
          ) : (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="card">
                  <div className="card-body orders-row-body">
                    <div>
                      <div className="orders-row-id">Order #{order.id}</div>
                      <div className="orders-row-date">{new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className={`badge ${statusBadgeClass(order.status)}`}>{order.status}</span>
                    <div className="orders-row-total">&#8377;{order.total_amount}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
