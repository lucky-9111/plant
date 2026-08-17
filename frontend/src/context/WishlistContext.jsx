import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";

const WishlistContext = createContext(null);
const PENDING_KEY = "pendingWishlistAction";

export function WishlistProvider({ children }) {
  const { session } = useAuth();
  const { showToast } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!session || session.type !== "customer") {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get("/customer/wishlist");
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refreshWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.type, session?.id]);

  const isInWishlist = useCallback(
    (plantId) => items.some((it) => it.plant_id === plantId),
    [items]
  );

  const toggleWishlist = useCallback(
    async (plant) => {
      if (session === undefined) return;

      if (session === null) {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ plantId: plant.id }));
        navigate("/login", {
          state: { from: location.pathname + location.search, backgroundLocation: location },
        });
        return;
      }

      if (session.type !== "customer") {
        showToast("error", "Please log in with a customer account to use your wishlist.");
        return;
      }

      const alreadySaved = items.some((it) => it.plant_id === plant.id);
      try {
        if (alreadySaved) {
          setItems((prev) => prev.filter((it) => it.plant_id !== plant.id));
          await api.del(`/customer/wishlist/${plant.id}`);
          showToast("success", `${plant.name} removed from wishlist`);
        } else {
          const added = await api.post("/customer/wishlist", { plant_id: plant.id });
          setItems((prev) => [added, ...prev]);
          showToast("success", `${plant.name} added to wishlist`);
        }
      } catch (err) {
        showToast("error", err.message || "Could not update wishlist");
        refreshWishlist();
      }
    },
    [session, items, navigate, location, showToast, refreshWishlist]
  );

  const removeFromWishlist = useCallback(
    async (plantId) => {
      setItems((prev) => prev.filter((it) => it.plant_id !== plantId));
      try {
        await api.del(`/customer/wishlist/${plantId}`);
      } catch (err) {
        showToast("error", err.message || "Could not remove item");
        refreshWishlist();
      }
    },
    [showToast, refreshWishlist]
  );

  // Resumes a wishlist add that a guest attempted before being sent to login/signup.
  const resumePendingAction = useCallback(async () => {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_KEY);

    let pending;
    try {
      pending = JSON.parse(raw);
    } catch {
      return;
    }

    try {
      const added = await api.post("/customer/wishlist", { plant_id: pending.plantId });
      setItems((prev) => [added, ...prev]);
      showToast("success", "Added to wishlist");
    } catch (err) {
      showToast("error", err.message || "Could not add to wishlist");
    }
  }, [showToast]);

  const wishlistCount = items.length;

  return (
    <WishlistContext.Provider
      value={{
        items,
        loading,
        wishlistCount,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        resumePendingAction,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
