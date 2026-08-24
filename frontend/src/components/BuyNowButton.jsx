import { useCart } from "../context/CartContext";

export default function BuyNowButton({ plant, variantId = null, quantity = 1, className = "", style }) {
  const { buyNow } = useCart();
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
  const disabled = outOfStock || needsVariant || exceedsStock;

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    buyNow(plant, quantity, variantId);
  }

  return (
    <button
      type="button"
      className={`btn btn-gold ${className}`}
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
            : "Buy Now"}
    </button>
  );
}
