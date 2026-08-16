import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { Loading } from "../../components/Loading";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/dashboard").then(setData);
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

  return (
    <div>
      <div className="admin-page-head">
        <h1>Dashboard</h1>
      </div>

      <div className="stat-cards">
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
