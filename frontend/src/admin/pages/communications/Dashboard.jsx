import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading } from "../../../components/Loading";
import KpiCard from "../../analytics/KpiCard";

const MODULE_LABELS = {
  orders: "Orders",
  accounting: "Accounting",
  delivery: "Delivery",
  website: "Website",
  manual: "Manual Send",
  test: "Test Messages",
  campaign: "Campaigns",
};

export default function CommunicationsDashboard() {
  const [summary, setSummary] = useState(null);
  const [connection, setConnection] = useState(null);
  const [checking, setChecking] = useState(false);

  function load() {
    setSummary(null);
    api.get("/admin/communications/dashboard").then(setSummary);
  }

  useEffect(load, []);

  async function checkConnection() {
    setChecking(true);
    setConnection(null);
    try {
      const result = await api.get("/admin/communications/test-connection");
      setConnection(result);
    } catch (err) {
      setConnection({ status: "ERROR", message: err.message });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Communications</h1>
          <p style={{ color: "var(--color-text-muted)", margin: "4px 0 0", fontSize: "0.9rem" }}>
            Centralized WhatsApp messaging -- one service, one history, used by every module.
          </p>
        </div>
        <button className="btn btn-sm btn-outline dark" onClick={checkConnection} disabled={checking}>
          {checking ? "Checking..." : "Test AiSensy Connection"}
        </button>
      </div>

      {connection && (
        <div
          className={`alert ${connection.status === "CONNECTED" ? "alert-success" : "alert-error"}`}
          style={{ marginBottom: 20 }}
        >
          <strong>{connection.status}</strong>
          {connection.message ? ` -- ${connection.message}` : ""}
        </div>
      )}

      {!summary ? (
        <Loading />
      ) : (
        <>
          <div className="stat-cards" style={{ marginBottom: 28 }}>
            <KpiCard label="Sent" value={summary.sent.toLocaleString()} />
            <KpiCard label="Delivered" value={summary.delivered.toLocaleString()} />
            <KpiCard label="Read" value={summary.read.toLocaleString()} />
            <KpiCard label="Failed" value={summary.failed.toLocaleString()} />
            <KpiCard label="Queued" value={summary.queued.toLocaleString()} />
            <KpiCard label="Today" value={summary.today.toLocaleString()} />
            <KpiCard label="This Month" value={summary.this_month.toLocaleString()} />
          </div>

          <div className="admin-form-card">
            <h3 style={{ marginTop: 0 }}>Messages by Module (all time)</h3>
            {Object.keys(summary.by_module).length === 0 ? (
              <p style={{ color: "var(--color-text-muted)" }}>No messages sent yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.by_module).map(([mod, count]) => (
                      <tr key={mod}>
                        <td>{MODULE_LABELS[mod] || mod}</td>
                        <td>{count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
