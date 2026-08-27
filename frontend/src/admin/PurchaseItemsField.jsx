import { useEffect, useState } from "react";
import { api } from "../api";

// Repeatable {plant, quantity, unit_cost} rows for logging a procurement
// Purchase -- modeled directly on VariantsField.jsx's add/remove/update-row
// pattern, with a plant picker (name + current stock) instead of a tray-size
// number input.
export default function PurchaseItemsField({ value, onChange }) {
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
    onChange([...rows, { plant_id: "", quantity: 0, unit_cost: 0 }]);
  }

  return (
    <div className="variants-field">
      {rows.map((row, i) => {
        const plant = plants.find((p) => p.id === Number(row.plant_id));
        return (
          <div className="variant-row" key={`row-${i}`}>
            <div className="variant-row-inputs">
              <label>
                Plant
                <select
                  className="form-control"
                  value={row.plant_id}
                  onChange={(e) => updateRow(i, "plant_id", Number(e.target.value) || "")}
                >
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
                  value={row.unit_cost}
                  onChange={(e) => updateRow(i, "unit_cost", e.target.valueAsNumber || 0)}
                />
              </label>
            </div>
            {plant && row.quantity > 0 && row.unit_cost > 0 && (
              <small style={{ color: "var(--color-text-muted)" }}>
                Line total: ₹{(row.quantity * row.unit_cost).toLocaleString()}
              </small>
            )}
            <button type="button" className="btn btn-sm btn-danger" onClick={() => removeRow(i)}>
              Remove
            </button>
          </div>
        );
      })}
      <button type="button" className="btn btn-sm btn-outline dark" onClick={addRow}>
        + Add Plant
      </button>
    </div>
  );
}
