import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { Loading } from "../../components/Loading";
import { useOrderAlerts } from "../OrderAlertContext";

const STATS_REFRESH_MS = 30000;

function timeAgo(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const { alerts, dismissAlert } = useOrderAlerts();

  useEffect(() => {
    function load() {
      api.get("/admin/dashboard").then(setData);
    }
    load();
    const interval = setInterval(load, STATS_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <Loading />;

  const cards = [
    { label: "Categories", num: data.counts.categories, to: "/admin/categories" },
    { label: "Plants", num: data.counts.plants, to: "/admin/plants" },
    { label: "Services", num: data.counts.services, to: "/admin/services" },
    { label: "Testimonials", num: data.counts.testimonials, to: "/admin/testimonials" },
    { label: "Blog Posts", num: data.counts.blog_posts, to: "/admin/blog" },
    { label: "Inquiries", num: data.counts.inquiries, to: "/admin/inquiries" },
    { label: "Customer Logins", num: data.counts.customer_logins, to: "/admin/customer-logs" },
  ];

  const orderCards = [
    { label: "🚨 New Orders", num: alerts.length, to: "/admin/orders?status=Pending" },
    { label: "📞 Calls Pending", num: data.order_stats.calls_pending, to: "/admin/orders?status=Pending" },
    { label: "📦 Preparing", num: data.order_stats.preparing, to: "/admin/orders?status=Processing" },
    { label: "🚚 Out for Delivery", num: data.order_stats.out_for_delivery, to: "/admin/orders?status=Out%20For%20Delivery" },
    { label: "✅ Delivered", num: data.order_stats.delivered, to: "/admin/orders?status=Delivered" },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <h1>Dashboard</h1>
      </div>

      <div className="stat-cards" style={{ marginBottom: 28 }}>
        {orderCards.map((c) => (
          <Link key={c.label} to={c.to} className="stat-card">
            <div className="num">{c.num}</div>
            <div className="label">{c.label}</div>
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: "1.15rem" }}>🚨 New Orders</h2>
      {alerts.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>✓ No new orders</p>
      ) : (
        <div className="admin-table-wrap" style={{ marginBottom: 28 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Placed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.order_id}>
                  <td>#{a.order_id}</td>
                  <td>{a.customer_name}</td>
                  <td>&#8377;{a.amount}</td>
                  <td>{timeAgo(a.timestamp)}</td>
                  <td>
                    <div className="row-actions">
                      <Link
                        className="btn btn-sm btn-primary"
                        to={`/admin/orders/${a.order_id}`}
                        onClick={() => dismissAlert(a.order_id)}
                      >
                        View Order
                      </Link>
                      <button type="button" className="btn btn-sm btn-outline dark" onClick={() => dismissAlert(a.order_id)}>
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="stat-cards" style={{ marginBottom: 28 }}>
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="stat-card">
            <div className="num">{c.num}</div>
            <div className="label">{c.label}</div>
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: "1.15rem" }}>Recent Inquiries</h2>
      {data.recent_inquiries.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>No inquiries yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Product</th>
                <th>Requirement</th>
                <th>Received</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_inquiries.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>{i.mobile}</td>
                  <td>
                    {i.plant ? (
                      <span className="badge badge-accent">{i.plant.name}</span>
                    ) : (
                      <span className="badge badge-muted">General</span>
                    )}
                  </td>
                  <td>{i.requirement || "-"}</td>
                  <td>{new Date(i.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className="badge badge-muted">{i.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
