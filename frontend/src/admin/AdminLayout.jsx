import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/Loading";

const NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/plants", label: "Plants" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/pricing-plans", label: "Pricing Plans" },
  { to: "/admin/faqs", label: "FAQs" },
  { to: "/admin/testimonials", label: "Testimonials" },
  { to: "/admin/gallery", label: "Gallery" },
  { to: "/admin/blog", label: "Blog" },
  { to: "/admin/inquiries", label: "Inquiries" },
  { to: "/admin/settings", label: "Site Settings" },
];

export default function AdminLayout() {
  const { username, logout } = useAuth();

  if (username === undefined) return <Loading />;
  if (username === null) return <Navigate to="/admin/login" replace />;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <span className="logo-mark">🌿</span> Aaiji Nursery
        </div>
        <nav className="admin-nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
          <div className="logout-btn">
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
              Log Out
            </a>
          </div>
        </nav>
      </aside>
      <div className="admin-main">
        <div className="admin-topbar">
          <strong>Admin Dashboard</strong>
          <span style={{ color: "var(--color-text-muted)", fontSize: "0.88rem" }}>
            Signed in as {username}
          </span>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
