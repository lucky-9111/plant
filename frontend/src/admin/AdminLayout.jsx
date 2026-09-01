import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "../components/Loading";
import ErrorBoundary from "../components/ErrorBoundary";
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
  { to: "/admin/developer/system-health", label: "System Health", end: true },
  { to: "/admin/developer/system-health/errors", label: "Active Errors" },
  { to: "/admin/developer/system-health/history", label: "Error History" },
  { to: "/admin/developer/system-health/functions", label: "Function Monitoring" },
  { to: "/admin/developer/system-health/logs", label: "System Logs" },
];

const ACCOUNTING_NAV = [
  { to: "/admin/accounting", label: "Overview", end: true },
  { to: "/admin/accounting/sales-orders", label: "Sales Orders" },
  { to: "/admin/accounting/invoices", label: "Invoices" },
  { to: "/admin/accounting/purchase-orders", label: "Purchase Orders" },
  { to: "/admin/accounting/bills", label: "Bills" },
  { to: "/admin/accounting/expenses", label: "Expenses" },
  { to: "/admin/accounting/parties", label: "Parties" },
  { to: "/admin/accounting/employees", label: "Employees" },
  { to: "/admin/accounting/reports", label: "Reports" },
  { to: "/admin/accounting/roles", label: "Roles" },
  { to: "/admin/accounting/chart-of-accounts", label: "Chart of Accounts" },
  { to: "/admin/accounting/tax-rates", label: "Tax Rates" },
];

const WORKFORCE_NAV = [
  { to: "/admin/labour", label: "Dashboard", end: true },
  { to: "/admin/labour/employees", label: "Employees" },
  { to: "/admin/labour/labour", label: "Labour" },
  { to: "/admin/labour/todays-work", label: "Today's Work" },
  { to: "/admin/labour/attendance", label: "Attendance" },
  { to: "/admin/labour/payroll", label: "Payroll" },
  { to: "/admin/labour/payments", label: "Payments" },
  { to: "/admin/labour/advances", label: "Advances" },
];

const DELIVERY_NAV = [
  { to: "/admin/delivery", label: "Dashboard", end: true },
  { to: "/admin/delivery/deliveries", label: "Delivery History" },
  { to: "/admin/delivery/drivers", label: "Drivers" },
  { to: "/admin/delivery/vehicles", label: "Vehicles" },
  { to: "/admin/delivery/trips", label: "Trips" },
  { to: "/admin/delivery/fuel", label: "Fuel / Petrol" },
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
          <div className="admin-nav-heading">Employees & Labour</div>
          {WORKFORCE_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
          <div className="admin-nav-heading">Delivery Management</div>
          {DELIVERY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
          {role === "developer" && (
            <>
              <div className="admin-nav-heading">Developer</div>
              {DEVELOPER_NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end}>
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
          <ErrorBoundary moduleName="Admin">
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
