// Mirrors app/accounting/models.py SALES_ORDER_STATUSES / INVOICE_STATUSES.
// Keep in sync with the backend if the accounting status vocabulary changes.
export function salesOrderBadgeClass(status) {
  if (status === "Invoiced") return "badge-accent";
  if (status === "Cancelled" || status === "Voided") return "badge-danger";
  return "badge-muted";
}

export function invoiceBadgeClass(status) {
  if (status === "Paid") return "badge-accent";
  if (status === "Overdue" || status === "Cancelled" || status === "Voided") return "badge-danger";
  if (status === "PartiallyPaid") return "badge-gold";
  return "badge-muted";
}

export function sourceBadgeClass(source) {
  return source === "online" ? "badge-accent" : "badge-muted";
}
