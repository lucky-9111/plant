// Mirrors app/labour/models.py's status vocabularies. Keep in sync with the
// backend if these lists ever change.
export function employeeStatusBadgeClass(status) {
  if (status === "Active") return "badge-accent";
  if (status === "Terminated" || status === "Inactive") return "badge-danger";
  if (status === "On Leave") return "badge-gold";
  return "badge-muted";
}

export function labourStatusBadgeClass(status) {
  return status === "Active" ? "badge-accent" : "badge-danger";
}

export function attendanceBadgeClass(status) {
  if (status === "Present" || status === "Worked") return "badge-accent";
  if (status === "Absent" || status === "Not Worked") return "badge-danger";
  if (status === "Half Day") return "badge-gold";
  return "badge-muted";
}

export function workAssignmentBadgeClass(status) {
  if (status === "Accepted") return "badge-accent";
  if (status === "Rejected" || status === "Cancelled") return "badge-danger";
  if (status === "No Response") return "badge-gold";
  return "badge-muted";
}

export function payrollStatusBadgeClass(status) {
  return status === "Finalized" ? "badge-accent" : "badge-muted";
}
