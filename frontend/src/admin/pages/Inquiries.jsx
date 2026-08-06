import { useEffect, useState } from "react";
import { api } from "../../api";
import { Loading, Empty } from "../../components/Loading";

const STATUSES = ["new", "contacted", "closed"];

export default function Inquiries() {
  const [items, setItems] = useState(null);

  function load() {
    setItems(null);
    api.get("/admin/inquiries").then(setItems);
  }

  useEffect(load, []);

  async function updateStatus(item, status) {
    await api.put(`/admin/inquiries/${item.id}/status`, { status });
    load();
  }

  async function remove(item) {
    if (!confirm(`Delete inquiry from "${item.name}"?`)) return;
    await api.del(`/admin/inquiries/${item.id}`);
    load();
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Inquiries</h1>
      </div>

      {!items ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty>No inquiries received yet.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Product</th>
                <th>Requirement</th>
                <th>Received</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.mobile}</td>
                  <td>
                    {item.plant ? (
                      <span className="badge badge-accent">{item.plant.name}</span>
                    ) : (
                      <span className="badge badge-muted">General</span>
                    )}
                  </td>
                  <td style={{ maxWidth: 260 }}>{item.requirement || "-"}</td>
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td>
                    <select
                      className="form-control"
                      style={{ padding: "6px 10px" }}
                      value={item.status}
                      onChange={(e) => updateStatus(item, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(item)}>
                      Delete
                    </button>
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
