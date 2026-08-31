import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Plants from "./pages/Plants";
import PlantDetail from "./pages/PlantDetail";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import Addresses from "./pages/Addresses";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Services from "./pages/Services";
import Pricing from "./pages/Pricing";
import FAQs from "./pages/FAQs";
import Contact from "./pages/Contact";
import Testimonials from "./pages/Testimonials";
import Gallery from "./pages/Gallery";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import LoginModal from "./components/LoginModal";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/pages/Dashboard";
import AdminAnalytics from "./admin/pages/Analytics";
import AdminPurchases from "./admin/pages/Purchases";
import AdminOrders from "./admin/pages/Orders";
import AdminOrderDetail from "./admin/pages/OrderDetail";
import AdminCategories from "./admin/pages/Categories";
import AdminPlants from "./admin/pages/Plants";
import AdminServices from "./admin/pages/Services";
import AdminPricingPlans from "./admin/pages/PricingPlans";
import AdminFAQs from "./admin/pages/FAQs";
import AdminTestimonials from "./admin/pages/Testimonials";
import AdminGallery from "./admin/pages/Gallery";
import AdminBlog from "./admin/pages/Blog";
import AdminInquiries from "./admin/pages/Inquiries";
import AdminCustomers from "./admin/pages/Customers";
import AdminCustomerDetail from "./admin/pages/CustomerDetail";
import AdminCustomerLogs from "./admin/pages/CustomerLogs";
import AdminSettings from "./admin/pages/Settings";
import AdminAdmins from "./admin/pages/Admins";
import AdminActivityLog from "./admin/pages/ActivityLog";
import AdminSystemInfo from "./admin/pages/SystemInfo";
import AccountingOverview from "./admin/pages/accounting/Overview";
import AccountingSalesOrders from "./admin/pages/accounting/SalesOrders";
import AccountingSalesOrderDetail from "./admin/pages/accounting/SalesOrderDetail";
import AccountingInvoices from "./admin/pages/accounting/Invoices";
import AccountingInvoiceDetail from "./admin/pages/accounting/InvoiceDetail";
import AccountingParties from "./admin/pages/accounting/Parties";
import AccountingPartyProfile from "./admin/pages/accounting/PartyProfile";
import AccountingChartOfAccounts from "./admin/pages/accounting/ChartOfAccounts";
import AccountingTaxRates from "./admin/pages/accounting/TaxRates";
import AccountingPurchaseOrders from "./admin/pages/accounting/PurchaseOrders";
import AccountingPurchaseOrderDetail from "./admin/pages/accounting/PurchaseOrderDetail";
import AccountingBills from "./admin/pages/accounting/Bills";
import AccountingBillDetail from "./admin/pages/accounting/BillDetail";
import AccountingExpenses from "./admin/pages/accounting/Expenses";
import AccountingExpenseDetail from "./admin/pages/accounting/ExpenseDetail";
import AccountingEmployees from "./admin/pages/accounting/Employees";
import AccountingReports from "./admin/pages/accounting/Reports";
import AccountingRoles from "./admin/pages/accounting/Roles";
import LabourDashboard from "./admin/pages/labour/Dashboard";
import LabourEmployees from "./admin/pages/labour/Employees";
import LabourEmployeeDetail from "./admin/pages/labour/EmployeeDetail";
import LabourLabour from "./admin/pages/labour/Labour";
import LabourLabourDetail from "./admin/pages/labour/LabourDetail";
import LabourTodaysWork from "./admin/pages/labour/TodaysWork";
import LabourAttendance from "./admin/pages/labour/Attendance";
import LabourPayroll from "./admin/pages/labour/Payroll";
import LabourPayments from "./admin/pages/labour/Payments";
import LabourAdvances from "./admin/pages/labour/Advances";
export default function App() {
  const location = useLocation();
  // When navigation to /login carries a backgroundLocation (set by the Navbar's
  // Login button and by the auth-guard redirects), render the routes as if we're
  // still on that background page, then overlay LoginModal on top of it below —
  // this is what makes login feel like a modal instead of a page navigation.
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/plants/:slug" element={<PlantDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/account" element={<Account />} />
          <Route path="/addresses" element={<Addresses />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/services" element={<Services />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Route>
        {/* Fallback full-page auth screens for direct URL visits/refreshes, i.e. when
            there's no background page to overlay. Mirrored below as overlay routes. */}
        <Route path="/login" element={<LoginModal />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="plants" element={<AdminPlants />} />
          <Route path="purchases" element={<AdminPurchases />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="pricing-plans" element={<AdminPricingPlans />} />
          <Route path="faqs" element={<AdminFAQs />} />
          <Route path="testimonials" element={<AdminTestimonials />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="blog" element={<AdminBlog />} />
          <Route path="inquiries" element={<AdminInquiries />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="customers/:id" element={<AdminCustomerDetail />} />
          <Route path="customer-logs" element={<AdminCustomerLogs />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="admins" element={<AdminAdmins />} />
          <Route path="developer/activity-log" element={<AdminActivityLog />} />
          <Route path="developer/system-info" element={<AdminSystemInfo />} />
          <Route path="accounting" element={<AccountingOverview />} />
          <Route path="accounting/sales-orders" element={<AccountingSalesOrders />} />
          <Route path="accounting/sales-orders/:id" element={<AccountingSalesOrderDetail />} />
          <Route path="accounting/invoices" element={<AccountingInvoices />} />
          <Route path="accounting/invoices/:id" element={<AccountingInvoiceDetail />} />
          <Route path="accounting/parties" element={<AccountingParties />} />
          <Route path="accounting/parties/:id" element={<AccountingPartyProfile />} />
          <Route path="accounting/chart-of-accounts" element={<AccountingChartOfAccounts />} />
          <Route path="accounting/tax-rates" element={<AccountingTaxRates />} />
          <Route path="accounting/purchase-orders" element={<AccountingPurchaseOrders />} />
          <Route path="accounting/purchase-orders/:id" element={<AccountingPurchaseOrderDetail />} />
          <Route path="accounting/bills" element={<AccountingBills />} />
          <Route path="accounting/bills/:id" element={<AccountingBillDetail />} />
          <Route path="accounting/expenses" element={<AccountingExpenses />} />
          <Route path="accounting/expenses/:id" element={<AccountingExpenseDetail />} />
          <Route path="accounting/employees" element={<AccountingEmployees />} />
          <Route path="accounting/reports" element={<AccountingReports />} />
          <Route path="accounting/roles" element={<AccountingRoles />} />
          <Route path="labour" element={<LabourDashboard />} />
          <Route path="labour/employees" element={<LabourEmployees />} />
          <Route path="labour/employees/:id" element={<LabourEmployeeDetail />} />
          <Route path="labour/labour" element={<LabourLabour />} />
          <Route path="labour/labour/:id" element={<LabourLabourDetail />} />
          <Route path="labour/todays-work" element={<LabourTodaysWork />} />
          <Route path="labour/attendance" element={<LabourAttendance />} />
          <Route path="labour/payroll" element={<LabourPayroll />} />
          <Route path="labour/payments" element={<LabourPayments />} />
          <Route path="labour/advances" element={<LabourAdvances />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="/login" element={<LoginModal />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      )}
    </>
  );
}
