import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Loading, Empty } from "../components/Loading";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const PINCODE_PATTERN = /^\d{6}$/;

const EMPTY_FORM = {
  full_name: "",
  mobile: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  address_type: "Home",
  is_default: false,
};

function AddressForm({ initial, onCancel, onSaved }) {
  const { showToast } = useCart();
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(initial?.id);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!MOBILE_PATTERN.test(form.mobile.trim())) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!PINCODE_PATTERN.test(form.pincode.trim())) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const saved = isEdit
        ? await api.put(`/customer/addresses/${initial.id}`, form)
        : await api.post("/customer/addresses", form);
      showToast("success", isEdit ? "Address updated" : "Address added");
      onSaved(saved);
    } catch (err) {
      setError(err.message || "Could not save address");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Close" onClick={onCancel}>
          &times;
        </button>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>{isEdit ? "Edit Address" : "Add New Address"}</h3>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="addr_full_name">Full Name</label>
              <input
                id="addr_full_name"
                className="form-control"
                required
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="addr_mobile">Phone Number</label>
              <input
                id="addr_mobile"
                className="form-control"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                required
                value={form.mobile}
                onChange={(e) => update("mobile", e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="addr_line1">Address Line</label>
            <input
              id="addr_line1"
              className="form-control"
              required
              value={form.line1}
              onChange={(e) => update("line1", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="addr_line2">Address Line 2 (optional)</label>
            <input
              id="addr_line2"
              className="form-control"
              value={form.line2}
              onChange={(e) => update("line2", e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="addr_city">City</label>
              <input
                id="addr_city"
                className="form-control"
                required
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="addr_state">State</label>
              <input
                id="addr_state"
                className="form-control"
                required
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="addr_pincode">Pincode</label>
              <input
                id="addr_pincode"
                className="form-control"
                inputMode="numeric"
                maxLength={6}
                required
                value={form.pincode}
                onChange={(e) => update("pincode", e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="addr_type">Address Type</label>
              <select
                id="addr_type"
                className="form-control"
                value={form.address_type}
                onChange={(e) => update("address_type", e.target.value)}
              >
                <option value="Home">Home</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="checkbox-row" style={{ marginBottom: 20 }}>
            <input
              type="checkbox"
              id="addr_default"
              checked={form.is_default}
              onChange={(e) => update("is_default", e.target.checked)}
            />
            <label htmlFor="addr_default" style={{ margin: 0 }}>
              Set as default address
            </label>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? "Saving..." : "Save Address"}
            </button>
            <button type="button" className="btn btn-outline dark" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddressCard({ address, onEdit, onDelete, onSetDefault }) {
  const [busy, setBusy] = useState(false);

  async function run(action) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card address-card">
      <div className="card-body">
        <div className="address-card-header">
          <span className={`badge ${address.address_type === "Home" ? "badge-accent" : "badge-muted"}`}>
            {address.address_type}
          </span>
          {address.is_default && <span className="badge badge-gold">Default</span>}
        </div>

        <p className="address-card-name">{address.full_name}</p>
        <p className="address-card-line">{address.line1}</p>
        {address.line2 && <p className="address-card-line">{address.line2}</p>}
        <p className="address-card-line">
          {address.city}, {address.state}
        </p>
        <p className="address-card-line">Pincode: {address.pincode}</p>
        <p className="address-card-line address-card-mobile">Phone: {address.mobile}</p>

        <div className="address-card-actions">
          <button type="button" className="btn btn-outline dark btn-sm" onClick={() => onEdit(address)} disabled={busy}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-outline dark btn-sm"
            onClick={() => run(() => onDelete(address.id))}
            disabled={busy}
          >
            Delete
          </button>
          {!address.is_default && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => run(() => onSetDefault(address.id))}
              disabled={busy}
            >
              Set as Default
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Addresses() {
  useDocumentTitle("My Addresses | Aaiji Nursery");
  const { session } = useAuth();
  const { showToast } = useCart();
  const [addresses, setAddresses] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  function loadAddresses() {
    api
      .get("/customer/addresses")
      .then(setAddresses)
      .catch(() => setAddresses([]));
  }

  useEffect(() => {
    if (session?.type === "customer") loadAddresses();
  }, [session]);

  if (session === undefined) return <Loading />;
  if (session === null)
    return (
      <Navigate
        to="/login"
        state={{ from: "/addresses", backgroundLocation: { pathname: "/" } }}
        replace
      />
    );
  if (session.type !== "customer") return <Navigate to="/" replace />;

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(address) {
    setEditing(address);
    setShowForm(true);
  }

  function handleSaved() {
    setShowForm(false);
    setEditing(null);
    loadAddresses();
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this address?")) return;
    try {
      await api.del(`/customer/addresses/${id}`);
      showToast("success", "Address deleted");
      loadAddresses();
    } catch (err) {
      showToast("error", err.message || "Could not delete address");
    }
  }

  async function handleSetDefault(id) {
    try {
      await api.put(`/customer/addresses/${id}/default`);
      loadAddresses();
    } catch (err) {
      showToast("error", err.message || "Could not set default address");
    }
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>My Addresses</h1>
          <p>Manage your saved delivery addresses.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              + Add Address
            </button>
          </div>

          {!addresses ? (
            <Loading />
          ) : addresses.length === 0 ? (
            <Empty>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text)" }}>
                You haven't saved any addresses yet
              </p>
              <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>
                Add Your First Address
              </button>
            </Empty>
          ) : (
            <div className="address-grid">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <AddressForm
          initial={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
