import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

const EMPLOYEE_STATUSES = ["Present", "Absent", "Half Day", "Leave", "Holiday"];
const LABOUR_STATUSES = ["Worked", "Not Worked", "Half Day"];

export default function Attendance() {
  const [workerType, setWorkerType] = useState("EMPLOYEE");
  const [date, setDate] = useState(todayDateInput());
  const [workers, setWorkers] = useState(null);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState({});

  function load() {
    setWorkers(null);
    const workerEndpoint = workerType === "EMPLOYEE" ? "/admin/labour/employees" : "/admin/labour/labour";
    const attendanceEndpoint =
      workerType === "EMPLOYEE"
        ? `/admin/labour/attendance/employees?date_from=${date}&date_to=${date}`
        : `/admin/labour/attendance/labour?date_from=${date}&date_to=${date}`;

    Promise.all([api.get(workerEndpoint), api.get(attendanceEndpoint)]).then(([workerList, attendanceList]) => {
      const activeWorkers = workerList.filter((w) => w.status === "Active");
      setWorkers(activeWorkers);
      const map = {};
      const initDraft = {};
      attendanceList.forEach((a) => {
        const workerId = workerType === "EMPLOYEE" ? a.employee_id : a.labour_id;
        map[workerId] = a;
      });
      activeWorkers.forEach((w) => {
        const existing = map[w.id];
        initDraft[w.id] = {
          status: existing?.status || (workerType === "EMPLOYEE" ? "Present" : "Worked"),
          overtime_hours: existing?.overtime_hours || 0,
        };
      });
      setAttendanceMap(map);
      setDraft(initDraft);
    });
  }

  useEffect(load, [workerType, date]);

  async function saveAttendance(workerId) {
    setSaving((s) => ({ ...s, [workerId]: true }));
    const endpoint = workerType === "EMPLOYEE" ? "/admin/labour/attendance/employees" : "/admin/labour/attendance/labour";
    const payload =
      workerType === "EMPLOYEE"
        ? {
            employee_id: workerId,
            attendance_date: date,
            status: draft[workerId].status,
            overtime_hours: draft[workerId].overtime_hours,
          }
        : {
            labour_id: workerId,
            attendance_date: date,
            status: draft[workerId].status,
            overtime_hours: draft[workerId].overtime_hours,
          };
    try {
      await api.post(endpoint, payload);
      load();
    } finally {
      setSaving((s) => ({ ...s, [workerId]: false }));
    }
  }

  const statusOptions = workerType === "EMPLOYEE" ? EMPLOYEE_STATUSES : LABOUR_STATUSES;

  return (
    <div>
      <div className="admin-page-head">
        <h1>Attendance</h1>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <select className="form-control" style={{ maxWidth: 180 }} value={workerType} onChange={(e) => setWorkerType(e.target.value)}>
          <option value="EMPLOYEE">Employees</option>
          <option value="LABOUR">Labour</option>
        </select>
        <input
          type="date"
          className="form-control"
          style={{ maxWidth: 180 }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {!workers ? (
        <Loading />
      ) : workers.length === 0 ? (
        <Empty>No active workers of this type yet.</Empty>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Overtime Hours</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id}>
                  <td>{w.name}</td>
                  <td>
                    <select
                      className="form-control"
                      value={draft[w.id]?.status}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [w.id]: { ...d[w.id], status: e.target.value } }))
                      }
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      style={{ maxWidth: 100 }}
                      value={draft[w.id]?.overtime_hours}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [w.id]: { ...d[w.id], overtime_hours: e.target.valueAsNumber || 0 },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={saving[w.id]}
                      onClick={() => saveAttendance(w.id)}
                    >
                      {saving[w.id] ? "Saving..." : attendanceMap[w.id] ? "Update" : "Mark"}
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
