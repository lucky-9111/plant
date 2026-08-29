import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../../api";
import { Loading } from "../../../components/Loading";
import { employeeStatusBadgeClass, attendanceBadgeClass, payrollStatusBadgeClass } from "../../labour/labourStatus";
import AuditTrail from "../../accounting/AuditTrail";

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [payroll, setPayroll] = useState(null);
  const [payments, setPayments] = useState(null);
  const [advances, setAdvances] = useState(null);
  const [error, setError] = useState("");

  function load() {
    setEmployee(null);
    setError("");
    api.get(`/admin/labour/employees/${id}`).then(setEmployee).catch((err) => setError(err.message || "Could not load this employee."));
    api.get(`/admin/labour/attendance/employees?employee_id=${id}`).then(setAttendance);
    api.get(`/admin/labour/payroll?worker_type=EMPLOYEE&employee_id=${id}`).then(setPayroll);
    api.get(`/admin/labour/payments?worker_type=EMPLOYEE&employee_id=${id}`).then(setPayments);
    api.get(`/admin/labour/advances?worker_type=EMPLOYEE&employee_id=${id}`).then(setAdvances);
  }

  useEffect(load, [id]);

  if (error && !employee) return <div className="alert alert-error">{error}</div>;
  if (!employee) return <Loading />;

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1 style={{ marginBottom: 4 }}>{employee.name}</h1>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`badge ${employeeStatusBadgeClass(employee.status)}`}>{employee.status}</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{employee.role}</span>
          </span>
        </div>
        <Link className="btn btn-sm btn-outline dark" to="/admin/labour/employees">
          &larr; Back to Employees
        </Link>
      </div>

      <div className="admin-order-detail-grid">
        <div>
          <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Employment Information</h2>
            <div className="form-group"><label>Department</label><div>{employee.department || "-"}</div></div>
            <div className="form-group"><label>Monthly Salary</label><div>₹{employee.salary.toLocaleString()}</div></div>
            <div className="form-group"><label>Overtime Rate</label><div>₹{employee.overtime_rate}/hour</div></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Phone</label><div>{employee.phone || "-"}</div></div>
          </div>

          <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Recent Attendance</h2>
            {!attendance ? (
              <Loading />
            ) : attendance.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", margin: 0 }}>No attendance recorded yet.</p>
            ) : (
              <div className="admin-order-status-history">
                {attendance.slice(0, 15).map((a) => (
                  <div key={a.id} className="admin-order-status-history-item">
                    <strong>{new Date(a.attendance_date).toLocaleDateString()}</strong>{" "}
                    <span className={`badge ${attendanceBadgeClass(a.status)}`}>{a.status}</span>
                    {a.overtime_hours > 0 && <div className="meta">Overtime: {a.overtime_hours}h</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Payroll History</h2>
            {!payroll ? (
              <Loading />
            ) : payroll.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", margin: 0 }}>No payroll generated yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Period</th><th>Gross</th><th>Net Payable</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {payroll.map((p) => (
                      <tr key={p.id}>
                        <td>{p.period_month}/{p.period_year}</td>
                        <td>₹{p.gross_earnings.toLocaleString()}</td>
                        <td>₹{p.net_payable.toLocaleString()}</td>
                        <td><span className={`badge ${payrollStatusBadgeClass(p.status)}`}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <AuditTrail tableName="accounting_employees" recordId={employee.id} />
        </div>

        <div>
          <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Financial Summary</h2>
            <div className="cart-summary-row cart-summary-total">
              <span>Outstanding</span>
              <span>₹{employee.outstanding.toLocaleString()}</span>
            </div>
          </div>

          <div className="admin-form-card" style={{ maxWidth: "none", marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Advances</h2>
            {!advances ? (
              <Loading />
            ) : advances.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", margin: 0 }}>No advances given.</p>
            ) : (
              advances.map((a) => (
                <div key={a.id} style={{ marginBottom: 10 }}>
                  <strong>₹{a.amount.toLocaleString()}</strong> on {new Date(a.advance_date).toLocaleDateString()}
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                    Remaining: ₹{a.remaining_amount.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="admin-form-card" style={{ maxWidth: "none" }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Payments</h2>
            {!payments ? (
              <Loading />
            ) : payments.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", margin: 0 }}>No payments recorded yet.</p>
            ) : (
              payments.map((p) => (
                <div key={p.id} style={{ marginBottom: 10 }}>
                  <strong>₹{p.amount.toLocaleString()}</strong> via {p.method}
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                    {new Date(p.payment_date).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
