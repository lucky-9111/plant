import { useEffect, useState } from "react";
import { api } from "../../api";

// Repeatable {plant, description, quantity, unit_price} rows for a Purchase
// Order -- modeled on SalesOrderItemsField.jsx, but plant_id is required
// (not optional) since converting to a Bill increments that plant's real
// stock, mirroring the existing PurchaseItemsField.jsx business rule.
export default function PurchaseOrderItemsField({ value, onChange }) {
  const rows = value || [];
  const [plants, setPlants] = useState([]);

  useEffect(() => {
    api.get("/admin/plants").then(setPlants);
  }, []);

  function updateRow(index, key, val) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: val } : row)));
  }

  function removeRow(index) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...rows, { plant_id: "", description: "", quantity: 1, unit_price: 0 }]);
  }

  function selectPlant(index, plantId) {
    const plant = plants.find((p) => p.id === Number(plantId));
    onChange(
      rows.map((row, i) =>
        i === index
          ? {
              ...row,
              plant_id: plantId ? Number(plantId) : "",
              description: plant ? plant.name : row.description,
            }
          : row
      )
    );
  }

  return (
    <div className="variants-field">
      {rows.map((row, i) => (
        <div className="variant-row" key={`row-${i}`}>
          <div className="variant-row-inputs">
            <label>
              Plant
              <select className="form-control" value={row.plant_id} onChange={(e) => selectPlant(i, e.target.value)}>
                <option value="">Select a plant...</option>
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (current stock: {p.stock_quantity})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity
              <input
                type="number"
                className="form-control"
                value={row.quantity}
                onChange={(e) => updateRow(i, "quantity", e.target.valueAsNumber || 0)}
              />
            </label>
            <label>
              Unit Cost (₹)
              <input
                type="number"
                step="any"
                className="form-control"
                value={row.unit_price}
                onChange={(e) => updateRow(i, "unit_price", e.target.valueAsNumber || 0)}
              />
            </label>
          </div>
          {row.quantity > 0 && row.unit_price > 0 && (
            <small style={{ color: "var(--color-text-muted)" }}>
              Line total: ₹{(row.quantity * row.unit_price).toLocaleString()}
            </small>
          )}
          <button type="button" className="btn btn-sm btn-danger" onClick={() => removeRow(i)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline dark" onClick={addRow}>
        + Add Line Item
      </button>
    </div>
  );
}
