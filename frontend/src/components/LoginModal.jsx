import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import logoImg from "../assets/logo.png";

const REMEMBER_KEY = "rememberedIdentifier";
const CLOSE_ANIMATION_MS = 180;

export default function LoginModal() {
  const { session, login } = useAuth();
  const { resumePendingAction } = useCart();
  const { resumePendingAction: resumeWishlistPendingAction } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;
  const fromPath = location.state?.from || backgroundLocation?.pathname;
  const isOverlay = Boolean(backgroundLocation);

  const [form, setForm] = useState(() => ({
    identifier: localStorage.getItem(REMEMBER_KEY) || "",
    password: "",
  }));
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  // Once handleSubmit decides where to navigate, this permanently suppresses the
  // "already logged in" redirect below — otherwise unrelated re-renders triggered
  // by CartContext (e.g. its cart refresh effect firing after session changes)
  // can re-run that redirect and overwrite our own in-flight navigate() call.
  const navigatedRef = useRef(false);
  const firstFieldRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOverlay) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOverlay]);

  function goToBackground() {
    const target = backgroundLocation
      ? { pathname: backgroundLocation.pathname, search: backgroundLocation.search || "" }
      : "/";
    navigate(target, { replace: true });
  }

  function handleClose() {
    if (!isOverlay) {
      goToBackground();
      return;
    }
    setClosing(true);
    setTimeout(goToBackground, CLOSE_ANIMATION_MS);
  }

  useEffect(() => {
    if (!isOverlay) return;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key === "Tab" && cardRef.current) {
        const focusables = cardRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const list = Array.from(focusables);
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOverlay]);

  if (session === null) {
    // not logged in, show the form below
  } else if (session && !navigatedRef.current) {
    const isAdminType = session.type === "admin" || session.type === "developer";
    return <Navigate to={isAdminType ? "/admin" : fromPath || "/"} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login(form.identifier, form.password);
      navigatedRef.current = true;
      if (remember) localStorage.setItem(REMEMBER_KEY, form.identifier);
      else localStorage.removeItem(REMEMBER_KEY);

      const isAdminType = data.type === "admin" || data.type === "developer";
      if (isAdminType) {
        navigate("/admin", { replace: true });
      } else {
        const resumed = await resumePendingAction();
        await resumeWishlistPendingAction();
        if (resumed?.navigateTo) {
          navigate(resumed.navigateTo, { state: resumed.state, replace: true });
        } else {
          navigate(fromPath || "/", { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  const cardContent = (
    <>
      {isOverlay && (
        <button type="button" className="auth-modal-close" onClick={handleClose} aria-label="Close login form">
          &times;
        </button>
      )}

      <Link to="/" className="brand auth-modal-logo-link">
        <img src={logoImg} alt="Aaiji Nursery" className="auth-modal-logo" />
      </Link>

      <h2 id="login-modal-title" className="auth-modal-title">
        Welcome back
      </h2>
      <p className="auth-modal-subtitle">Sign in to continue to your account.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="login-identifier">Email or Username</label>
          <input
            id="login-identifier"
            ref={firstFieldRef}
            className="form-control"
            placeholder="Email or Username"
            required
            value={form.identifier}
            onChange={(e) => setForm((f) => ({ ...f, identifier: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className="form-control"
            placeholder="Enter your password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </div>

        <div className="auth-modal-row">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="auth-modal-link">
            Forgot password?
          </Link>
        </div>

        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="auth-modal-footer-text">
        New here? <Link to="/signup" state={location.state}>Create an account</Link>
      </p>

      {!isOverlay && (
        <p className="auth-modal-footer-text">
          <Link to="/">Back to Home</Link>
        </p>
      )}
    </>
  );

  if (!isOverlay) {
    return (
      <div className="auth-page-shell">
        <div className="auth-modal-card auth-page-card" ref={cardRef}>
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`auth-modal-overlay ${closing ? "closing" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`auth-modal-card ${closing ? "closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        ref={cardRef}
      >
        {cardContent}
      </div>
    </div>
  );
}
