import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading } from "../../../components/Loading";

const ROLES = ["Owner", "Admin", "Accountant", "Sales Staff", "Purchase Staff", "Viewer"];

export default function Roles() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  function load() {
    setUsers(null);
    setError("");
    api
      .get("/admin/accounting/roles")
      .then(setUsers)
      .catch((err) =>
        setError(
          err.status === 403
            ? "Only an Owner can manage Accounting roles."
            : err.message || "Could not load roles."
        )
      );
  }

  useEffect(load, []);

  async function handleChange(userId, newRole) {
    setSavingId(userId);
    setError("");
    try {
      await api.put(`/admin/accounting/roles/${userId}`, { accounting_role: newRole });
      load();
    } catch (err) {
      setError(err.message || "Unable to update this role.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Accounting Roles</h1>
      </div>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
        Controls what each admin user can do inside Accounting only -- separate from their Website Management
        access. A new admin defaults to Viewer (read-only) until an Owner assigns a role here.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {!users ? (
        !error && <Loading />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Accounting Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>
                    <select
                      className="form-control"
                      style={{ maxWidth: 200 }}
                      value={u.accounting_role || ""}
                      disabled={savingId === u.id}
                      onChange={(e) => handleChange(u.id, e.target.value)}
                    >
                      <option value="" disabled>
                        Not assigned (Viewer)
                      </option>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
