import { useState } from "react";
import { useCart } from "../context/CartContext";

export default function AddToCartButton({ plant, variantId = null, quantity = 1, className = "", style }) {
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(false);
  const hasVariants = plant.variants && plant.variants.length > 0;
  const selectedVariant = hasVariants ? plant.variants.find((v) => v.id === variantId) : null;
  const needsVariant = hasVariants && !selectedVariant;
  const outOfStock = hasVariants
    ? selectedVariant
      ? selectedVariant.stock_quantity <= 0
      : false
    : plant.stock_quantity <= 0;
  const exceedsStock = hasVariants
    ? selectedVariant && quantity > selectedVariant.stock_quantity
    : quantity > plant.stock_quantity;
  const disabled = loading || outOfStock || needsVariant || exceedsStock;

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setLoading(true);
    try {
      await addToCart(plant, quantity, variantId);
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
      disabled={disabled}
    >
      {outOfStock
        ? "Out of Stock"
        : needsVariant
          ? "Select a Tray Size"
          : exceedsStock
            ? "Not Enough Stock"
            : loading
              ? "Adding..."
              : "Add to Cart"}
    </button>
  );
}
