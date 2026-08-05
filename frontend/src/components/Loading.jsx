export function Loading() {
  return (
    <div className="loading-state">
      <div className="spinner" />
      Loading...
    </div>
  );
}

export function Empty({ children = "Nothing here yet." }) {
  return <div className="empty-state">{children}</div>;
}
