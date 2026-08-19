// Mirrors app/models.py MAIN_STATUSES / EXTRA_STATUSES / CANCELLABLE_STATUSES.
// Keep in sync with the backend if the order lifecycle ever changes there.
export const TRACKER_STEPS = [
  "Pending",
  "Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Out For Delivery",
  "Delivered",
];

export const STEP_LABELS = { Pending: "Order Placed" };

export const TERMINAL_STATUSES = ["Cancelled", "Refund Initiated", "Refund Completed", "Returned"];

export const ALL_ORDER_STATUS_OPTIONS = [...TRACKER_STEPS, ...TERMINAL_STATUSES];

export const WARNING_STATUSES = ["Cancelled", "Returned", "Refund Initiated", "Refund Completed"];

export const CANCELLABLE_STATUSES = ["Pending", "Confirmed"];

export const CANCELLATION_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Delivery taking too long",
  "Found another product",
  "Other",
];

export function statusLabel(status) {
  return STEP_LABELS[status] || status;
}

export function statusBadgeClass(status) {
  if (status === "Delivered") return "badge-accent";
  if (WARNING_STATUSES.includes(status)) return "badge-gold";
  return "badge-muted";
}

export function paymentBadgeClass(status) {
  if (status === "Paid") return "badge-accent";
  if (status === "Failed") return "badge-gold";
  return "badge-muted";
}
