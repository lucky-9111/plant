import { useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import logoImg from "../assets/logo.png";

export default function Login() {
  const { session, login } = useAuth();
  const { resumePendingAction } = useCart();
  const { resumePendingAction: resumeWishlistPendingAction } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: "", password: "" });
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
      const data = await login(form.identifier, form.password);
      navigatedRef.current = true;
      const isAdminType = data.type === "admin" || data.type === "developer";
      if (isAdminType) {
        navigate("/admin", { replace: true });
      } else {
        const resumed = await resumePendingAction();
        await resumeWishlistPendingAction();
        if (resumed?.navigateTo) {
          navigate(resumed.navigateTo, { state: resumed.state, replace: true });
        } else {
          navigate(location.state?.from || "/", { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || "Login failed.");
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
        <h1 style={{ fontSize: "1.3rem" }}>Login</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="identifier">Email or Username</label>
            <input
              id="identifier"
              className="form-control"
              placeholder="Email or Username"
              required
              autoFocus
              value={form.identifier}
              onChange={(e) => setForm((f) => ({ ...f, identifier: e.target.value }))}
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
          <p style={{ textAlign: "right", marginTop: -8, marginBottom: 16, fontSize: "0.85rem" }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: "0.9rem", textAlign: "center" }}>
          New here? <Link to="/signup" state={location.state}>Create an account</Link>
        </p>
        <p style={{ marginTop: 8, fontSize: "0.9rem", textAlign: "center" }}>
          <Link to="/">Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
