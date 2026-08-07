import { useEffect, useState } from "react";
import { api } from "../../api";
import { Loading } from "../../components/Loading";

const LABELS = {
  categories: "Categories",
  plants: "Plants",
  services: "Services",
  testimonials: "Testimonials",
  gallery_images: "Gallery Images",
  blog_posts: "Blog Posts",
  inquiries: "Inquiries",
  customers: "Customers",
  orders: "Orders",
  admin_users: "Admin Users",
};

export default function SystemInfo() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/system-info").then(setData);
  }, []);

  if (!data) return <Loading />;

  return (
    <div>
      <div className="admin-page-head">
        <h1>System Info</h1>
      </div>

      {data.session_secret_is_default && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          Session secret is still the default development value. Set a real{" "}
          <code>SESSION_SECRET_KEY</code> environment variable before deploying this site
          publicly.
        </div>
      )}

      <div className="stat-cards">
        {Object.entries(data.counts).map(([key, num]) => (
          <div key={key} className="stat-card">
            <div className="num">{num}</div>
            <div className="label">{LABELS[key] || key}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: "1.15rem", marginTop: 24 }}>Database Backup</h2>
      <p style={{ color: "var(--color-text-muted)" }}>
        Download a copy of the live SQLite database file for safekeeping.
      </p>
      <a className="btn btn-primary" href="/api/admin/backup" download>
        Download Backup
      </a>
    </div>
  );
}
