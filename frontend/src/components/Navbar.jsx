import { useState } from "react";
import { NavLink } from "react-router-dom";
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

        <NavSearch />

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
    </header>
  );
}
