import { useWishlist } from "../context/WishlistContext";

export default function WishlistButton({ plant, className = "", iconOnly = false }) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const active = isInWishlist(plant.id);

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(plant);
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        className={`wishlist-btn ${active ? "active" : ""} ${className}`}
        onClick={handleClick}
        aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={active}
        title={active ? "Remove from wishlist" : "Add to wishlist"}
      >
        {active ? "♥" : "♡"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`btn btn-outline dark ${active ? "wishlist-btn-active" : ""} ${className}`}
      onClick={handleClick}
      aria-pressed={active}
    >
      {active ? "♥ Saved to Wishlist" : "♡ Add to Wishlist"}
    </button>
  );
}
