import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);
const PENDING_KEY = "pendingCartAction";

export function CartProvider({ children }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const showToast = useCallback((type, message) => {
    setToast({ type, message, key: Date.now() });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  const refreshCart = useCallback(async () => {
    if (!session || session.type !== "customer") {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get("/customer/cart");
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.type, session?.id]);

  const addToCart = useCallback(
    async (plant, quantity = 1, variantId = null) => {
      if (session === undefined) return;

      if (session === null) {
        sessionStorage.setItem(
          PENDING_KEY,
          JSON.stringify({ type: "add", plantId: plant.id, quantity, variantId })
        );
        navigate("/login", {
          state: { from: location.pathname + location.search, backgroundLocation: location },
        });
        return;
      }

      if (session.type !== "customer") {
        showToast("error", "Please log in with a customer account to add items to your cart.");
        return;
      }

      try {
        await api.post("/customer/cart", { plant_id: plant.id, variant_id: variantId, quantity });
        showToast("success", `${plant.name} added to cart`);
        refreshCart();
      } catch (err) {
        showToast("error", err.message || "Could not add to cart");
      }
    },
    [session, navigate, location, showToast, refreshCart]
  );

  const buyNow = useCallback(
    (plant, quantity = 1, variantId = null) => {
      if (session === undefined) return;

      if (session === null) {
        sessionStorage.setItem(
          PENDING_KEY,
          JSON.stringify({ type: "buyNow", plantId: plant.id, quantity, slug: plant.slug, variantId })
        );
        navigate("/login", {
          state: { from: location.pathname + location.search, backgroundLocation: location },
        });
        return;
      }

      if (session.type !== "customer") {
        showToast("error", "Please log in with a customer account to purchase.");
        return;
      }

      navigate("/checkout", {
        state: { buyNow: { plantId: plant.id, quantity, slug: plant.slug, variantId } },
      });
    },
    [session, navigate, location, showToast]
  );

  // Resumes whatever the guest was trying to do before being sent to login/signup.
  // Returns { navigateTo, state } when the caller should redirect somewhere specific
  // (e.g. straight into checkout for Buy Now), or null otherwise.
  const resumePendingAction = useCallback(async () => {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);

    let pending;
    try {
      pending = JSON.parse(raw);
    } catch {
      return null;
    }

    if (pending.type === "buyNow") {
      return {
        navigateTo: "/checkout",
        state: {
          buyNow: {
            plantId: pending.plantId,
            quantity: pending.quantity || 1,
            slug: pending.slug,
            variantId: pending.variantId ?? null,
          },
        },
      };
    }

    try {
      await api.post("/customer/cart", {
        plant_id: pending.plantId,
        variant_id: pending.variantId ?? null,
        quantity: pending.quantity || 1,
      });
      showToast("success", "Added to cart");
      refreshCart();
    } catch (err) {
      showToast("error", err.message || "Could not add to cart");
    }
    return null;
  }, [showToast, refreshCart]);

  const updateQuantity = useCallback(
    async (itemId, quantity) => {
      if (quantity < 1) return;
      try {
        const updated = await api.put(`/customer/cart/${itemId}`, { quantity });
        setItems((prev) => prev.map((it) => (it.id === itemId ? updated : it)));
      } catch (err) {
        showToast("error", err.message || "Could not update quantity");
      }
    },
    [showToast]
  );

  const removeItem = useCallback(
    async (itemId) => {
      try {
        await api.del(`/customer/cart/${itemId}`);
        setItems((prev) => prev.filter((it) => it.id !== itemId));
      } catch (err) {
        showToast("error", err.message || "Could not remove item");
      }
    },
    [showToast]
  );

  const cartCount = items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        cartCount,
        refreshCart,
        addToCart,
        buyNow,
        resumePendingAction,
        updateQuantity,
        removeItem,
        toast,
        clearToast,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
