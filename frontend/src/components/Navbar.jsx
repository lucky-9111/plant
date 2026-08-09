import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import NavSearch from "./NavSearch";
import logoImg from "../assets/logo.png";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/plants", label: "Plants" },
  { to: "/services", label: "Services" },
  { to: "/pricing", label: "Pricing" },
  { to: "/gallery", label: "Gallery" },
  { to: "/blog", label: "Blog" },
  { to: "/faqs", label: "FAQs" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const settings = useSettings();
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="navbar">
      <div className="container">
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <img className="brand-logo" src={logoImg} alt={settings.business_name || "Shri Aaiji Hightech Nursery"} />
        </NavLink>

        <nav className={`nav-links ${open ? "open" : ""}`}>
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink to="/contact" className="btn btn-primary" onClick={() => setOpen(false)}>
            Get in Touch
          </NavLink>
        </nav>

        <div className="nav-right">
        <div className="nav-actions">
          <NavSearch />

          {session === undefined ? null : session === null ? (
            <NavLink to="/login" className="nav-login-btn" onClick={() => setOpen(false)}>
              <span className="nav-login-icon" aria-hidden="true">
                &#128100;
              </span>
              <span className="nav-login-text">Login</span>
            </NavLink>
          ) : session.type === "customer" ? (
            <div className="nav-account">
              <span className="nav-account-avatar" aria-hidden="true">
                {(session.name || "U").charAt(0).toUpperCase()}
              </span>
              <span className="nav-account-name">{session.name}</span>
              <button type="button" className="nav-account-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="nav-account">
              <NavLink to="/admin" className="nav-account-link" onClick={() => setOpen(false)}>
                <span className="nav-account-avatar" aria-hidden="true">
                  &#128100;
                </span>
                <span className="nav-account-name">Dashboard</span>
              </NavLink>
              <button type="button" className="nav-account-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>

        <button
          className="nav-toggle"
          aria-label="Toggle navigation menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span style={open ? { transform: "translateY(7px) rotate(45deg)" } : undefined} />
          <span style={open ? { opacity: 0 } : undefined} />
          <span style={open ? { transform: "translateY(-7px) rotate(-45deg)" } : undefined} />
        </button>
        </div>
      </div>
    </header>
  );
}
