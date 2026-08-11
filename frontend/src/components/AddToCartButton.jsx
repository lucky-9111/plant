import { useState } from "react";
import { useCart } from "../context/CartContext";

export default function AddToCartButton({ plant, className = "", style }) {
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(false);
  const outOfStock = plant.stock_quantity <= 0;

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (loading || outOfStock) return;
    setLoading(true);
    try {
      await addToCart(plant);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-primary ${className}`}
      style={style}
      onClick={handleClick}
      disabled={loading || outOfStock}
    >
      {outOfStock ? "Out of Stock" : loading ? "Adding..." : "Add to Cart"}
    </button>
  );
}
