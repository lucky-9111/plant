import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api";
import AuthShell from "../components/AuthShell";

export default function ResetPassword() {
  const location = useLocation();
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
    <AuthShell title="Reset Password">
      {!token ? (
        <div className="alert alert-error">
          This reset link is invalid.{" "}
          <Link to="/forgot-password" state={location.state}>Request a new one</Link>.
        </div>
      ) : done ? (
        <>
          <div className="alert alert-success">Your password has been updated.</div>
          <p className="auth-modal-footer-text">
            <Link to="/login" state={location.state}>Go to login</Link>
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
    </AuthShell>
  );
}
