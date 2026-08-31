import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../api";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function partyLabel(c) {
  const suffix = c.phone ? c.phone.slice(-2) : "--";
  return `${c.name} (${suffix})`;
}

export default function DeliveryCreate() {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({
    delivery_date: todayDateInput(),
    expected_time: "",
    contact_id: "",
    customer_mobile: "",
    delivery_address: "",
    sales_order_id: "",
    driver_id: "",
    vehicle_id: "",
    notes: "",
    items: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/accounting/contacts").then(setParties);
    api.get("/admin/delivery/drivers?status=Active").then(setDrivers);
    api.get("/admin/delivery/vehicles?status=Available").then(setVehicles);
  }, []);

  useEffect(() => {
    if (!form.contact_id) {
      setSalesOrders([]);
      return;
    }
    api.get(`/admin/accounting/sales-orders?contact_id=${form.contact_id}`).then(setSalesOrders);
  }, [form.contact_id]);

  function selectParty(contactId) {
    const party = parties.find((p) => p.id === Number(contactId));
    setForm((f) => ({
      ...f,
      contact_id: contactId,
      customer_mobile: party?.phone || "",
      delivery_address: party?.address || "",
      sales_order_id: "",
      items: [],
    }));
  }

  function selectSalesOrder(soId) {
    const so = salesOrders.find((s) => s.id === Number(soId));
    setForm((f) => ({
      ...f,
      sales_order_id: soId,
      items: so ? so.items.map((i) => ({ plant_id: i.plant_id, description: i.description, unit: "pcs", ordered_quantity: i.quantity, notes: "" })) : [],
    }));
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { plant_id: null, description: "", unit: "pcs", ordered_quantity: 1, notes: "" }] }));
  }

  function updateItem(index, key, value) {
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, [key]: value } : it)) }));
  }

  function removeItem(index) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.contact_id) {
      setError("Please select a customer.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const delivery = await api.post("/admin/delivery/deliveries", {
        delivery_date: form.delivery_date,
        expected_time: form.expected_time,
        contact_id: Number(form.contact_id),
        customer_mobile: form.customer_mobile,
        delivery_address: form.delivery_address,
        sales_order_id: form.sales_order_id ? Number(form.sales_order_id) : null,
        driver_id: form.driver_id ? Number(form.driver_id) : null,
        vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
        notes: form.notes,
        items: form.sales_order_id ? [] : form.items,
      });
      navigate(`/admin/delivery/deliveries/${delivery.id}`);
    } catch (err) {
      setError(err.message || "Could not create this delivery.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>New Delivery</h1>
      </div>
      <div className="admin-form-card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="delivery_date">Delivery Date</label>
            <input id="delivery_date" type="date" className="form-control" required value={form.delivery_date} onChange={(e) => setForm((f) => ({ ...f, delivery_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="expected_time">Expected Delivery Time (optional)</label>
            <input id="expected_time" type="text" className="form-control" placeholder="e.g. 10:00 AM - 12:00 PM" value={form.expected_time} onChange={(e) => setForm((f) => ({ ...f, expected_time: e.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="contact_id">Customer</label>
            <select id="contact_id" className="form-control" required value={form.contact_id} onChange={(e) => selectParty(e.target.value)}>
              <option value="">Select a customer...</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>{partyLabel(p)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="customer_mobile">Mobile</label>
            <input id="customer_mobile" type="text" className="form-control" value={form.customer_mobile} onChange={(e) => setForm((f) => ({ ...f, customer_mobile: e.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="delivery_address">Delivery Address</label>
            <textarea id="delivery_address" className="form-control" value={form.delivery_address} onChange={(e) => setForm((f) => ({ ...f, delivery_address: e.target.value }))} />
          </div>
          {salesOrders.length > 0 && (
            <div className="form-group">
              <label htmlFor="sales_order_id">Link to Sales Order (optional -- auto-fills items)</label>
              <select id="sales_order_id" className="form-control" value={form.sales_order_id} onChange={(e) => selectSalesOrder(e.target.value)}>
                <option value="">No linked sales order</option>
                {salesOrders.map((so) => (
                  <option key={so.id} value={so.id}>{so.order_number} -- ₹{so.total_amount}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="driver_id">Driver</label>
            <select id="driver_id" className="form-control" value={form.driver_id} onChange={(e) => setForm((f) => ({ ...f, driver_id: e.target.value }))}>
              <option value="">Assign later</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="vehicle_id">Vehicle</label>
            <select id="vehicle_id" className="form-control" value={form.vehicle_id} onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Assign later</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number} -- {v.name_model}</option>)}
            </select>
          </div>

          {!form.sales_order_id && (
            <div className="form-group">
              <label>Items</label>
              <div className="variants-field">
                {form.items.map((item, i) => (
                  <div className="variant-row" key={i}>
                    <div className="variant-row-inputs">
                      <label>
                        Description
                        <input type="text" className="form-control" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                      </label>
                      <label>
                        Quantity
                        <input type="number" className="form-control" value={item.ordered_quantity} onChange={(e) => updateItem(i, "ordered_quantity", e.target.valueAsNumber || 0)} />
                      </label>
                      <label>
                        Unit
                        <input type="text" className="form-control" value={item.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} />
                      </label>
                    </div>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeItem(i)}>Remove</button>
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-outline dark" onClick={addItem}>+ Add Item</button>
              </div>
            </div>
          )}

          {form.sales_order_id && form.items.length > 0 && (
            <div className="form-group">
              <label>Items (from Sales Order)</label>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Description</th><th>Quantity</th></tr></thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={i}><td>{item.description}</td><td>{item.ordered_quantity}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" className="form-control" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Creating..." : "Create Delivery"}
          </button>
        </form>
      </div>
    </div>
  );
}
