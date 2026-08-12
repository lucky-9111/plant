import { useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import logoImg from "../assets/logo.png";

export default function Signup() {
  const { session, register } = useAuth();
  const { resumePendingAction } = useCart();
  const { resumePendingAction: resumeWishlistPendingAction } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", mobile: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Once handleSubmit decides where to navigate, this permanently suppresses the
  // "already logged in" redirect below — otherwise unrelated re-renders triggered
  // by CartContext (e.g. its cart refresh effect firing after session changes)
  // can re-run that redirect and overwrite our own in-flight navigate() call.
  const navigatedRef = useRef(false);

  if (session === null) {
    // not logged in, show the form below
  } else if (session && !navigatedRef.current) {
    const isAdminType = session.type === "admin" || session.type === "developer";
    return <Navigate to={isAdminType ? "/admin" : "/"} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form);
      navigatedRef.current = true;
      const resumed = await resumePendingAction();
      await resumeWishlistPendingAction();
      if (resumed?.navigateTo) {
        navigate(resumed.navigateTo, { state: resumed.state, replace: true });
      } else {
        navigate(location.state?.from || "/", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-shell">
      <div className="admin-login-card">
        <Link to="/" className="brand" style={{ color: "var(--color-primary)", marginBottom: 20 }}>
          <img src={logoImg} alt="Aaiji Nursery" className="admin-login-logo" />
        </Link>
        <h1 style={{ fontSize: "1.3rem" }}>Create Account</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              className="form-control"
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="mobile">Mobile</label>
            <input
              id="mobile"
              className="form-control"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: "0.9rem", textAlign: "center" }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
