import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../api";
import { Loading } from "../../../components/Loading";
import { expenseBadgeClass } from "../../accounting/accountingStatus";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpenseDetail() {
  const { id } = useParams();
  const [expense, setExpense] = useState(null);
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: "Cash", payment_date: todayDateInput(), reference: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [voiding, setVoiding] = useState(false);

  function load() {
    setExpense(null);
    setError("");
    api
      .get(`/admin/accounting/expenses/${id}`)
      .then(setExpense)
      .catch((err) => setError(err.message || "Could not load this expense."));
    api.get(`/admin/accounting/payments-out?expense_id=${id}`).then(setPayments);
  }

  useEffect(load, [id]);

  function openPaymentModal() {
    setPaymentForm({
      amount: expense.balance_due,
      method: "Cash",
      payment_date: todayDateInput(),
      reference: "",
      notes: "",
    });
    setError("");
    setShowPaymentModal(true);
  }

  async function handleRecordPayment(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/accounting/payments-out", {
        expense_id: expense.id,
        amount: paymentForm.amount,
        method: paymentForm.method,
        payment_date: paymentForm.payment_date,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      });
      setShowPaymentModal(false);
      load();
    } catch (err) {
      setError(err.message || "Unable to record this payment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid() {
    if (!confirm("Void this expense? It will be kept on record, marked Voided, and can no longer be edited.")) return;
    setVoiding(true);
    try {
      await api.post(`/admin/accounting/expenses/${id}/void`);
      load();
    } catch (err) {
      setError(err.message || "Unable to void this expense.");
    } finally {
      setVoiding(false);
    }
  }

  if (error && !expense) {
    return <div className="alert alert-error">{error}</div>;
  }
  if (!expense) return <Loading />;

  const canRecordPayment = expense.balance_due > 0 && expense.status !== "Voided";
  const canVoid = expense.status !== "Voided";

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>{expense.category} Expense</h1>
          <span className={`badge ${expenseBadgeClass(expense.status)}`}>{expense.status}</span>
        </div>
        <Link className="btn btn-sm btn-outline dark" to="/admin/accounting/expenses">
          &larr; Back to Expenses
        </Link>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="admin-order-detail-grid">
        <div>
          <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Details</h2>
            <div className="form-group">
              <label>Description</label>
              <div>{expense.description || "-"}</div>
            </div>
            <div className="form-group">
              <label>Date</label>
              <div>{new Date(expense.expense_date).toLocaleDateString()}</div>
            </div>
            {expense.account && (
              <div className="form-group">
                <label>Chart of Accounts</label>
                <div>{expense.account.code} - {expense.account.name}</div>
              </div>
            )}
            {expense.reference && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Reference</label>
                <div>{expense.reference}</div>
              </div>
            )}
          </div>

          <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
            <div className="cart-summary-row">
              <span>Amount</span>
              <span>&#8377;{expense.amount}</span>
            </div>
            <div className="cart-summary-row">
              <span>Tax</span>
              <span>&#8377;{expense.tax_amount}</span>
            </div>
            <div className="cart-summary-row cart-summary-total">
              <span>Total</span>
              <span>&#8377;{expense.total_amount}</span>
            </div>
            <div className="cart-summary-row">
              <span>Paid</span>
              <span>&#8377;{expense.amount_paid}</span>
            </div>
            <div className="cart-summary-row">
              <span>Balance Due</span>
              <span>&#8377;{expense.balance_due}</span>
            </div>
          </div>

          <div className="admin-form-card" style={{ maxWidth: "none" }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Payments</h2>
            {!payments ? (
              <Loading />
            ) : payments.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", margin: 0 }}>No payments recorded yet.</p>
            ) : (
              <div className="admin-order-status-history">
                {payments.map((p) => (
                  <div key={p.id} className="admin-order-status-history-item">
                    <strong>₹{p.amount.toLocaleString()} via {p.method}</strong>
                    <div className="meta">
                      {new Date(p.payment_date).toLocaleDateString()}
                      {p.reference ? ` · Ref: ${p.reference}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {expense.contact && (
            <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Payee</h2>
              <p style={{ margin: 0 }}>{expense.contact.name}</p>
              <p style={{ margin: 0, color: "var(--color-text-muted)" }}>{expense.contact.email}</p>
            </div>
          )}

          {canRecordPayment && (
            <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
              <button type="button" className="btn btn-primary btn-block" onClick={openPaymentModal}>
                Record Payment
              </button>
            </div>
          )}

          {canVoid && (
            <div className="admin-form-card" style={{ maxWidth: "none" }}>
              <button type="button" className="btn btn-danger btn-block" disabled={voiding} onClick={handleVoid}>
                {voiding ? "Voiding..." : "Void Expense"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowPaymentModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {!saving && (
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setShowPaymentModal(false)}
              >
                &times;
              </button>
            )}
            <h3 style={{ marginTop: 0 }}>Record Payment</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label htmlFor="amount">Amount (₹)</label>
                <input
                  id="amount"
                  type="number"
                  step="any"
                  className="form-control"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.valueAsNumber || 0 }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="method">Method</label>
                <select
                  id="method"
                  className="form-control"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
                >
                  {["Cash", "Bank", "UPI", "Card", "Online", "Other"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="payment_date">Payment Date</label>
                <input
                  id="payment_date"
                  type="date"
                  className="form-control"
                  required
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reference">Reference (optional)</label>
                <input
                  id="reference"
                  type="text"
                  className="form-control"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                />
              </div>
              <button className="btn btn-primary btn-block" disabled={saving}>
                {saving ? "Saving..." : "Save Payment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
