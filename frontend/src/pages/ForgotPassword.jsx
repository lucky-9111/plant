import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import logoImg from "../assets/logo.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/customer/forgot-password", { email });
    } catch {
      // ignore - always show the same generic confirmation
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <div className="admin-login-shell">
      <div className="admin-login-card">
        <Link to="/" className="brand" style={{ color: "var(--color-primary)", marginBottom: 20 }}>
          <img src={logoImg} alt="Aaiji Nursery" className="admin-login-logo" />
        </Link>
        <h1 style={{ fontSize: "1.3rem" }}>Forgot Password</h1>
        {sent ? (
          <>
            <div className="alert alert-success" style={{ marginTop: 12 }}>
              If that email is registered, we've sent a password reset link to it.
            </div>
            <p style={{ marginTop: 16, fontSize: "0.9rem", textAlign: "center" }}>
              <Link to="/login">Back to login</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-control"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <p style={{ marginTop: 16, fontSize: "0.9rem", textAlign: "center" }}>
              <Link to="/login">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
