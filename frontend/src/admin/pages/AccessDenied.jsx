export default function AccessDenied() {
  return (
    <div className="admin-form-card" style={{ textAlign: "center", padding: "48px 24px" }}>
      <h1 style={{ marginTop: 0 }}>Access Denied</h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        You don't have permission to view this page. If you believe this is a mistake, contact a Developer to review
        your account's permissions.
      </p>
    </div>
  );
}
