import { useCart } from "../context/CartContext";

export default function BuyNowButton({ plant, className = "", style }) {
  const { buyNow } = useCart();
  const outOfStock = plant.stock_quantity <= 0;

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    buyNow(plant);
  }

  return (
    <button
      type="button"
      className={`btn btn-gold ${className}`}
      style={style}
      onClick={handleClick}
      disabled={outOfStock}
    >
      {outOfStock ? "Out of Stock" : "Buy Now"}
    </button>
  );
}
