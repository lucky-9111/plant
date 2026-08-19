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
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="plants" element={<AdminPlants />} />
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
