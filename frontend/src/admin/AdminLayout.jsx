import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/Loading";
import logoImg from "../assets/logo.png";

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
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/settings", label: "Site Settings" },
  { to: "/admin/admins", label: "Admins" },
];

const DEVELOPER_NAV = [
  { to: "/admin/developer/activity-log", label: "Activity Log" },
  { to: "/admin/developer/system-info", label: "System Info" },
];

export default function AdminLayout() {
  const { username, role, logout } = useAuth();

  if (username === undefined) return <Loading />;
  if (username === null) return <Navigate to="/login" replace />;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <span className="admin-logo-chip">
            <img src={logoImg} alt="Aaiji Nursery" />
          </span>
          Aaiji Nursery
        </div>
        <nav className="admin-nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
          {role === "developer" && (
            <>
              <div className="admin-nav-heading">Developer</div>
              {DEVELOPER_NAV.map((item) => (
                <NavLink key={item.to} to={item.to}>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
          <div className="logout-btn">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (confirm("Are you sure you want to log out?")) logout();
              }}
            >
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
