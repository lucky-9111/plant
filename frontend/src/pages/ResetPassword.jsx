import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import logoImg from "../assets/logo.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/customer/reset-password", { token, password: form.password });
      setDone(true);
    } catch (err) {
      setError(err.message || "Reset failed.");
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
        <h1 style={{ fontSize: "1.3rem" }}>Reset Password</h1>

        {!token ? (
          <div className="alert alert-error">
            This reset link is invalid. <Link to="/forgot-password">Request a new one</Link>.
          </div>
        ) : done ? (
          <>
            <div className="alert alert-success" style={{ marginTop: 12 }}>
              Your password has been updated.
            </div>
            <p style={{ marginTop: 16, fontSize: "0.9rem", textAlign: "center" }}>
              <Link to="/login">Go to login</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                className="form-control"
                required
                autoFocus
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm">Confirm Password</label>
              <input
                id="confirm"
                type="password"
                className="form-control"
                required
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
