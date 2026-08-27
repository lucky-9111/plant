// Reuses the existing .stat-card look (see Dashboard.jsx / admin.css) and adds
// an optional small +/-% trend chip -- no new visual language.
export default function KpiCard({ label, value, changePct, sublabel, to }) {
  const trend =
    changePct === null || changePct === undefined ? null : changePct >= 0 ? "up" : "down";

  const content = (
    <>
      <div className="num">{value}</div>
      <div className="label">
        {label}
        {trend && (
          <span className={`analytics-kpi-trend analytics-kpi-trend-${trend}`}>
            {trend === "up" ? "▲" : "▼"} {Math.abs(changePct)}%
          </span>
        )}
      </div>
      {sublabel && <div className="analytics-kpi-sublabel">{sublabel}</div>}
    </>
  );

  if (to) {
    return (
      <a href={to} className="stat-card">
        {content}
      </a>
    );
  }
  return <div className="stat-card">{content}</div>;
}
