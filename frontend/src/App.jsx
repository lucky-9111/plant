import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Plants from "./pages/Plants";
import PlantDetail from "./pages/PlantDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import Orders from "./pages/Orders";
import Services from "./pages/Services";
import Pricing from "./pages/Pricing";
import FAQs from "./pages/FAQs";
import Contact from "./pages/Contact";
import Testimonials from "./pages/Testimonials";
import Gallery from "./pages/Gallery";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/pages/Dashboard";
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
import AdminSettings from "./admin/pages/Settings";
import AdminAdmins from "./admin/pages/Admins";
import AdminActivityLog from "./admin/pages/ActivityLog";
import AdminSystemInfo from "./admin/pages/SystemInfo";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/plants" element={<Plants />} />
        <Route path="/plants/:slug" element={<PlantDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/account" element={<Account />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/services" element={<Services />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/faqs" element={<FAQs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/testimonials" element={<Testimonials />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
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
        <Route path="settings" element={<AdminSettings />} />
        <Route path="admins" element={<AdminAdmins />} />
        <Route path="developer/activity-log" element={<AdminActivityLog />} />
        <Route path="developer/system-info" element={<AdminSystemInfo />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
