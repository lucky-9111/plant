export default function TraySelector({ plant, selectedVariantId, onSelect, quantity, onQuantityChange }) {
  const variants = plant.variants || [];
  const selected = variants.find((v) => v.id === selectedVariantId) || null;
  const total = selected ? Math.round(selected.price * quantity * 100) / 100 : 0;

  return (
    <div className="tray-selector">
      <div className="price" style={{ fontSize: "1.3rem" }}>
        Price per plant: &#8377;{plant.price}
      </div>

      <div className="tray-selector-label">Tray Size</div>
      <div className="tray-selector-pills">
        {variants.map((variant) => {
          const outOfStock = variant.stock_quantity <= 0;
          return (
            <button
              key={variant.id}
              type="button"
              className={`pill tray-pill ${selectedVariantId === variant.id ? "active" : ""} ${outOfStock ? "tray-pill-disabled" : ""}`}
              onClick={() => !outOfStock && onSelect(variant.id)}
              disabled={outOfStock}
            >
              {variant.tray_size} Plants
              {outOfStock ? " (Out of Stock)" : ""}
            </button>
          );
        })}
      </div>

      {selected ? (
        <>
          <div className="tray-selector-label">Number of Trays</div>
          <div className="cart-row-qty" style={{ marginBottom: 10 }}>
            <button
              type="button"
              className="qty-btn"
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease number of trays"
            >
              &minus;
            </button>
            <span className="qty-value">{quantity}</span>
            <button
              type="button"
              className="qty-btn"
              onClick={() => onQuantityChange(Math.min(selected.stock_quantity, quantity + 1))}
              disabled={quantity >= selected.stock_quantity}
              aria-label="Increase number of trays"
            >
              +
            </button>
          </div>
          <div className="tray-selector-total">
            Selected: <strong>{quantity} &times; {selected.tray_size} Plants</strong>
            <br />
            {quantity} &times; {selected.tray_size} &times; &#8377;{plant.price} = &#8377;{total}
          </div>
        </>
      ) : (
        <div className="tray-selector-total tray-selector-hint">Please select a tray size above.</div>
      )}
    </div>
  );
}
