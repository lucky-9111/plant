import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { Loading } from "../components/Loading";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function Account() {
  useDocumentTitle("My Account | Aaiji Nursery");
  const { session, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (session?.type === "customer") {
      api
        .get("/customer/me")
        .then(setProfile)
        .catch(() => {});
    }
  }, [session]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  if (session === undefined) return <Loading />;
  if (session === null)
    return (
      <Navigate
        to="/login"
        state={{ from: "/account", backgroundLocation: { pathname: "/" } }}
        replace
      />
    );
  if (session.type !== "customer") return <Navigate to="/" replace />;
  if (!profile) return <Loading />;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>My Account</h1>
          <p>Manage your profile, orders, and preferences.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="card account-profile-card">
            <div className="card-body account-profile-body">
              <span className="account-avatar-lg" aria-hidden="true">
                {(profile.name || "U").charAt(0).toUpperCase()}
              </span>
              <div>
                <h2 style={{ margin: "0 0 6px" }}>{profile.name}</h2>
                <p style={{ margin: 0, color: "var(--color-text-muted)" }}>{profile.email}</p>
                {profile.mobile && (
                  <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)" }}>{profile.mobile}</p>
                )}
                {profile.created_at && (
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                    Member since {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-3">
            <Link to="/cart" className="card account-tile">
              <span className="account-tile-icon" aria-hidden="true">
                &#128722;
              </span>
              <h3>My Cart</h3>
              <p>{cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""} in your cart` : "Your cart is empty"}</p>
            </Link>

            <Link to="/orders" className="card account-tile">
              <span className="account-tile-icon" aria-hidden="true">
                &#128230;
              </span>
              <h3>My Orders</h3>
              <p>Track and review your past orders</p>
            </Link>

            <Link to="/wishlist" className="card account-tile">
              <span className="account-tile-icon" aria-hidden="true">
                &#10084;
              </span>
              <h3>Wishlist</h3>
              <p>
                {wishlistCount > 0
                  ? `${wishlistCount} item${wishlistCount !== 1 ? "s" : ""} saved`
                  : "Save your favorite plants"}
              </p>
            </Link>

            <Link to="/addresses" className="card account-tile">
              <span className="account-tile-icon" aria-hidden="true">
                &#128205;
              </span>
              <h3>My Addresses</h3>
              <p>Manage your saved delivery addresses</p>
            </Link>

            <Link to="/forgot-password" className="card account-tile">
              <span className="account-tile-icon" aria-hidden="true">
                &#9881;
              </span>
              <h3>Account Settings</h3>
              <p>Change your password</p>
            </Link>

            <button type="button" className="card account-tile account-tile-button" onClick={handleLogout}>
              <span className="account-tile-icon" aria-hidden="true">
                &#128682;
              </span>
              <h3>Logout</h3>
              <p>Sign out of your account</p>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
