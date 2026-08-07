import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Plants from "./pages/Plants";
import PlantDetail from "./pages/PlantDetail";
import Services from "./pages/Services";
import Pricing from "./pages/Pricing";
import FAQs from "./pages/FAQs";
import Contact from "./pages/Contact";
import Testimonials from "./pages/Testimonials";
import Gallery from "./pages/Gallery";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";

import AdminLayout from "./admin/AdminLayout";
import AdminLogin from "./admin/pages/Login";
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
        <Route path="/services" element={<Services />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/faqs" element={<FAQs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/testimonials" element={<Testimonials />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
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
        <Route path="settings" element={<AdminSettings />} />
        <Route path="admins" element={<AdminAdmins />} />
        <Route path="developer/activity-log" element={<AdminActivityLog />} />
        <Route path="developer/system-info" element={<AdminSystemInfo />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
