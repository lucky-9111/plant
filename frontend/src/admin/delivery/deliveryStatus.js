// Mirrors app/delivery/models.py's status vocabularies.
export function deliveryStatusBadgeClass(status) {
  if (status === "Delivered") return "badge-accent";
  if (status === "Failed" || status === "Cancelled") return "badge-danger";
  if (status === "Partially Delivered") return "badge-gold";
  return "badge-muted";
}

export function vehicleStatusBadgeClass(status) {
  if (status === "Available") return "badge-accent";
  if (status === "Inactive" || status === "Maintenance") return "badge-danger";
  if (status === "On Trip") return "badge-gold";
  return "badge-muted";
}

export function driverStatusBadgeClass(status) {
  if (status === "Active") return "badge-accent";
  if (status === "Inactive") return "badge-danger";
  return "badge-muted";
}

export function tripStatusBadgeClass(status) {
  return status === "Completed" ? "badge-accent" : "badge-gold";
}
