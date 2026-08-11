import { useEffect } from "react";
import { useCart } from "../context/CartContext";

export default function Toast() {
  const { toast, clearToast } = useCart();

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(clearToast, 2500);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div
      className={`toast alert ${toast.type === "error" ? "alert-error" : "alert-success"}`}
      role="status"
    >
      {toast.message}
    </div>
  );
}
