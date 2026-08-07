import { useEffect, useState } from "react";
import { api } from "../../api";
import { Loading, Empty } from "../../components/Loading";
import { useAuth } from "../../context/AuthContext";

const blankForm = { username: "", password: "", role: "admin" };

export default function Admins() {
  const [items, setItems] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { username, role } = useAuth();
  const isDeveloper = role === "developer";

  function load() {
    setItems(null);
    api.get("/admin/admins").then(setItems);
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/admins", form);
      setForm(blankForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message || "Could not create admin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(item) {
    const password = prompt(`New password for "${item.username}":`);
    if (!password) return;
    try {
      await api.put(`/admin/admins/${item.id}/password`, { password });
      alert(`Password updated for "${item.username}".`);
    } catch (err) {
      alert(err.message || "Could not reset password.");
    }
  }

  async function handleRoleChange(item, newRole) {
    if (!confirm(`Change "${item.username}"'s role to ${newRole}?`)) return;
    try {
      await api.put(`/admin/admins/${item.id}/role`, { role: newRole });
      load();
    } catch (err) {
      alert(err.message || "Could not change role.");
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Delete admin "${item.username}"? This cannot be undone.`)) return;
    try {
      await api.del(`/admin/admins/${item.id}`);
      load();
    } catch (err) {
      alert(err.message || "Could not delete admin.");
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Admins</h1>
        {isDeveloper && (
          <button className="btn btn-sm btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ Add Admin"}
          </button>
        )}
      </div>

      {isDeveloper && showForm && (
        <div className="admin-form-card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="new-username">Username</label>
              <input
                id="new-username"
                className="form-control"
                required
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-password">Password</label>
              <input
                id="new-password"
                type="text"
                className="form-control"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-role">Role</label>
              <select
                id="new-role"
                className="form-control"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
              </select>
            </div>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Create Admin"}
            </button>
          </form>
        </div>
      )}

      {!items ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty>No admins found.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                {isDeveloper && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>
                    {item.username}
                    {item.username === username && (
                      <span className="badge badge-accent" style={{ marginLeft: 8 }}>
                        You
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={item.role === "developer" ? "badge badge-accent" : "badge badge-muted"}>
                      {item.role}
                    </span>
                  </td>
                  {isDeveloper && (
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-outline dark" onClick={() => handleResetPassword(item)}>
                          Reset Password
                        </button>
                        <button
                          className="btn btn-sm btn-outline dark"
                          onClick={() => handleRoleChange(item, item.role === "developer" ? "admin" : "developer")}
                        >
                          Make {item.role === "developer" ? "Admin" : "Developer"}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={item.username === username}
                          onClick={() => handleDelete(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
