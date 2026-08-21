export default function VariantsField({ value, onChange }) {
  const rows = value || [];

  function updateRow(index, key, val) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: val } : row)));
  }

  function removeRow(index) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...rows, { tray_size: 0, stock_quantity: 0 }]);
  }

  return (
    <div className="variants-field">
      {rows.map((row, i) => (
        <div className="variant-row" key={row.id ?? `new-${i}`}>
          <div className="variant-row-inputs">
            <label>
              Tray Size
              <input
                type="number"
                className="form-control"
                value={row.tray_size}
                onChange={(e) => updateRow(i, "tray_size", e.target.valueAsNumber || 0)}
              />
            </label>
            <label>
              Stock
              <input
                type="number"
                className="form-control"
                value={row.stock_quantity}
                onChange={(e) => updateRow(i, "stock_quantity", e.target.valueAsNumber || 0)}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => removeRow(i)}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline dark" onClick={addRow}>
        + Add Another Tray Option
      </button>
    </div>
  );
}
