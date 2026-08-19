import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoImg from "../assets/logo.png";

const CLOSE_ANIMATION_MS = 180;

// Shared chrome for every auth page (Login, Signup, Forgot/Reset Password) so
// they all render as the same premium card, and all behave the same way:
// opened from a nav action (backgroundLocation in state) they overlay as a
// modal with a close button; opened directly (URL visit/refresh) they render
// as a full page with a "Back to Home" link instead.
export default function AuthShell({ title, subtitle, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const backgroundLocation = location.state?.backgroundLocation;
  const isOverlay = Boolean(backgroundLocation);

  const [closing, setClosing] = useState(false);
  const cardRef = useRef(null);

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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOverlay]);

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

  const cardContent = (
    <>
      {isOverlay && (
        <button type="button" className="auth-modal-close" onClick={handleClose} aria-label="Close">
          &times;
        </button>
      )}

      <Link to="/" className="brand auth-modal-logo-link">
        <img src={logoImg} alt="Aaiji Nursery" className="auth-modal-logo" />
      </Link>

      <h2 className="auth-modal-title">{title}</h2>
      {subtitle && <p className="auth-modal-subtitle">{subtitle}</p>}

      {children}

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
        aria-label={title}
        ref={cardRef}
      >
        {cardContent}
      </div>
    </div>
  );
}
