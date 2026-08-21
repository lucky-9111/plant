export default function TraySelector({ plant, selectedVariantId, onSelect }) {
  const variants = plant.variants || [];
  const selected = variants.find((v) => v.id === selectedVariantId) || null;

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
        <div className="tray-selector-total">
          Selected: <strong>{selected.tray_size} Plants</strong>
          <br />
          {selected.tray_size} &times; &#8377;{plant.price} = &#8377;{selected.price}
        </div>
      ) : (
        <div className="tray-selector-total tray-selector-hint">Please select a tray size above.</div>
      )}
    </div>
  );
}
