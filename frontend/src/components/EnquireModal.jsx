import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

// Feature 1's dedicated "Enquire Now" flow, for a Plant the nursery has
// explicitly marked ENQUIRY_AVAILABLE -- intentionally separate from
// checkout/cart: submitting this only ever creates an Inquiry record for
// the team, never a cart line, order, or payment.
export default function EnquireModal({ plant, onClose }) {
  const { session } = useAuth();
  const isCustomer = session?.type === "customer";

  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null); // holds the created enquiry on success

  useEffect(() => {
    if (!isCustomer) return;
    api.get("/customer/me").then((c) => {
      setName(c.name || "");
      setEmail(c.email || "");
      setMobile(c.mobile || "");
    }).catch(() => {});
  }, [isCustomer]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await api.post("/enquiries", {
        plant_id: plant.id,
        quantity: Number(quantity),
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setSubmitted(result);
    } catch (err) {
      setError(err.message || "Could not submit your enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          &times;
        </button>

        {submitted ? (
          <>
            <h3 style={{ marginTop: 0 }}>Enquiry Sent ✓</h3>
            <p>
              Thank you! Your enquiry <strong>{submitted.enquiry_number}</strong> for{" "}
              <strong>{plant.name}</strong> has been received.
            </p>
            <p style={{ color: "var(--color-text-muted)" }}>
              Our team will contact you at {submitted.mobile} to let you know if we can prepare this plant.
            </p>
            <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={onClose}>
              Close
            </button>
          </>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>Enquire About {plant.name}</h3>
            <p style={{ color: "var(--color-text-muted)" }}>
              This plant is currently out of stock, but we may be able to prepare it for you. Tell us what you need
              and our team will get in touch.
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="enq-quantity">Quantity needed</label>
                <input
                  id="enq-quantity"
                  type="number"
                  min="1"
                  className="form-control"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="enq-name">Your name</label>
                <input
                  id="enq-name"
                  type="text"
                  className="form-control"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="enq-mobile">Mobile number</label>
                <input
                  id="enq-mobile"
                  type="tel"
                  className="form-control"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="enq-email">Email (optional)</label>
                <input
                  id="enq-email"
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="enq-message">Message (optional)</label>
                <textarea
                  id="enq-message"
                  className="form-control"
                  rows={3}
                  placeholder="Any specific requirement, size, or timeline..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-outline dark" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? "Sending..." : "Send Enquiry"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
