import { useCart } from "../context/CartContext";

export default function BuyNowButton({ plant, variantId = null, className = "", style }) {
  const { buyNow } = useCart();
  const hasVariants = plant.variants && plant.variants.length > 0;
  const selectedVariant = hasVariants ? plant.variants.find((v) => v.id === variantId) : null;
  const needsVariant = hasVariants && !selectedVariant;
  const outOfStock = hasVariants
    ? selectedVariant
      ? selectedVariant.stock_quantity <= 0
      : false
    : plant.stock_quantity <= 0;
  const disabled = outOfStock || needsVariant;

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    buyNow(plant, 1, variantId);
  }

  return (
    <button
      type="button"
      className={`btn btn-gold ${className}`}
      style={style}
      onClick={handleClick}
      disabled={disabled}
    >
      {outOfStock ? "Out of Stock" : needsVariant ? "Select a Tray Size" : "Buy Now"}
    </button>
  );
}
