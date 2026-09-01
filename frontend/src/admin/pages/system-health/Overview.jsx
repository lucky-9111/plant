import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../api";
import { Loading } from "../../../components/Loading";

const STATUS_BADGE_CLASS = {
  healthy: "badge-accent",
  warning: "badge-gold",
  degraded: "badge-gold",
  critical: "badge-danger",
  unknown: "badge-muted",
};

function ModuleTile({ tile }) {
  const params = new URLSearchParams({ module: tile.module === "Orders & Payments" ? "Checkout" : tile.module });
  return (
    <Link to={`/admin/developer/system-health/errors?${params}`} className="stat-card" style={{ textDecoration: "none" }}>
      <div className="num" style={{ fontSize: "1.6rem" }}>
        {tile.emoji}
      </div>
      <div className="label">{tile.module}</div>
      <span className={`badge ${STATUS_BADGE_CLASS[tile.status] || "badge-muted"}`} style={{ marginTop: 6 }}>
        {tile.label_text}
      </span>
    </Link>
  );
}

export default function SystemHealthOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  function load() {
    setError("");
    api.get("/admin/system-health/overview").then(setData).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  if (error) {
    return (
      <div>
        <div className="admin-page-head">
          <h1>System Health</h1>
        </div>
        <div className="alert alert-error">
          Could not load System Health. <button className="btn btn-outline dark" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return <Loading />;

  return (
    <div>
      <div className="admin-page-head">
        <h1>System Health</h1>
        <button type="button" className="btn btn-outline dark" onClick={load}>
          Refresh
        </button>
      </div>

      <h2 style={{ fontSize: "1.05rem", marginBottom: 10 }}>Module Health</h2>
      <div className="stat-cards">
        {data.modules.map((tile) => (
          <ModuleTile key={tile.module} tile={tile} />
        ))}
      </div>

      <h2 style={{ fontSize: "1.05rem", margin: "24px 0 10px" }}>Last 24 Hours</h2>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="num">{data.stats.errors_today}</div>
          <div className="label">Errors Today</div>
        </div>
        <div className="stat-card">
          <div className="num">{data.stats.errors_24h}</div>
          <div className="label">Errors Last 24h</div>
        </div>
        <div className="stat-card">
          <div className="num">{data.stats.errors_7d}</div>
          <div className="label">Errors Last 7 Days</div>
        </div>
        <div className="stat-card">
          <div className="num">{data.stats.critical_active}</div>
          <div className="label">Critical Active</div>
        </div>
        <div className="stat-card">
          <div className="num">{data.stats.active}</div>
          <div className="label">Active Errors</div>
        </div>
        <div className="stat-card">
          <div className="num">{data.stats.resolved}</div>
          <div className="label">Resolved</div>
        </div>
      </div>

      <h2 style={{ fontSize: "1.05rem", margin: "24px 0 10px" }}>Top Failing Functions</h2>
      {data.top_failing_functions.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>No failures recorded yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Function</th>
                <th>Endpoint</th>
                <th>Failures</th>
              </tr>
            </thead>
            <tbody>
              {data.top_failing_functions.map((f, idx) => (
                <tr key={idx}>
                  <td>{f.module}{f.sub_module ? ` / ${f.sub_module}` : ""}</td>
                  <td>{f.function}</td>
                  <td>{f.endpoint}</td>
                  <td>{f.failure_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
