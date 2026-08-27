import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/Loading";
import logoImg from "../assets/logo.png";

const NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/plants", label: "Plants" },
  { to: "/admin/purchases", label: "Purchases" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/pricing-plans", label: "Pricing Plans" },
  { to: "/admin/faqs", label: "FAQs" },
  { to: "/admin/testimonials", label: "Testimonials" },
  { to: "/admin/gallery", label: "Gallery" },
  { to: "/admin/blog", label: "Blog" },
  { to: "/admin/inquiries", label: "Inquiries" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/customer-logs", label: "Customer Logs" },
  { to: "/admin/settings", label: "Site Settings" },
  { to: "/admin/admins", label: "Admins" },
];

const DEVELOPER_NAV = [
  { to: "/admin/developer/activity-log", label: "Activity Log" },
  { to: "/admin/developer/system-info", label: "System Info" },
];

const ACCOUNTING_NAV = [
  { to: "/admin/accounting", label: "Overview", end: true },
  { to: "/admin/accounting/sales-orders", label: "Sales Orders" },
  { to: "/admin/accounting/invoices", label: "Invoices" },
  { to: "/admin/accounting/purchase-orders", label: "Purchase Orders" },
  { to: "/admin/accounting/bills", label: "Bills" },
  { to: "/admin/accounting/expenses", label: "Expenses" },
  { to: "/admin/accounting/contacts", label: "Contacts" },
  { to: "/admin/accounting/employees", label: "Employees" },
  { to: "/admin/accounting/reports", label: "Reports" },
  { to: "/admin/accounting/roles", label: "Roles" },
  { to: "/admin/accounting/chart-of-accounts", label: "Chart of Accounts" },
  { to: "/admin/accounting/tax-rates", label: "Tax Rates" },
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
          <div className="admin-nav-heading">Accounting</div>
          {ACCOUNTING_NAV.map((item) => (
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
