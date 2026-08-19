import { useState } from "react";
import { CANCELLATION_REASONS } from "../utils/orderStatus";

export default function CancelOrderModal({ orderId, onClose, onConfirm, submitting }) {
  const [reason, setReason] = useState(CANCELLATION_REASONS[0]);
  const [otherText, setOtherText] = useState("");

  function handleConfirm() {
    const remarks = reason === "Other" ? otherText.trim() || "Other" : reason;
    onConfirm(remarks);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          &times;
        </button>
        <h3 style={{ marginTop: 0 }}>Cancel Order{orderId ? ` #${orderId}` : ""}?</h3>
        <p style={{ color: "var(--color-text-muted)" }}>
          Are you sure you want to cancel this order? This cannot be undone.
        </p>

        <div className="form-group">
          <label htmlFor="cancel-reason">Reason for cancellation</label>
          <select
            id="cancel-reason"
            className="form-control"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {CANCELLATION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {reason === "Other" && (
          <div className="form-group">
            <label htmlFor="cancel-reason-other">Please specify</label>
            <input
              id="cancel-reason-other"
              className="form-control"
              placeholder="Tell us more (optional)"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            type="button"
            className="btn btn-outline dark"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={submitting}
          >
            Keep Order
          </button>
          <button
            type="button"
            className="btn btn-danger"
            style={{ flex: 1 }}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Cancelling..." : "Yes, Cancel Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
