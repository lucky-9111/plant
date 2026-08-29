import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading } from "../../../components/Loading";
import KpiCard from "../../analytics/KpiCard";

const now = new Date();

export default function LabourDashboard() {
  const [today, setToday] = useState(null);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [monthly, setMonthly] = useState(null);

  useEffect(() => {
    api.get("/admin/labour/dashboard/today").then(setToday);
  }, []);

  useEffect(() => {
    setMonthly(null);
    api
      .get(`/admin/labour/dashboard/monthly-cost?period_year=${periodYear}&period_month=${periodMonth}`)
      .then(setMonthly);
  }, [periodYear, periodMonth]);

  return (
    <div>
      <div className="admin-page-head">
        <h1>Employees & Labour Dashboard</h1>
      </div>

      <h2 style={{ fontSize: "1.1rem" }}>Today's Attendance</h2>
      {!today ? (
        <Loading />
      ) : (
        <div className="stat-cards" style={{ marginBottom: 28 }}>
          <KpiCard label="Employees" value={today.employees_total} sublabel={`${today.employees_present} present · ${today.employees_absent} absent`} />
          <KpiCard label="Labour Available" value={today.labour_available} />
          <KpiCard label="Labour Called" value={today.labour_called} sublabel={`${today.labour_accepted} accepted`} />
          <KpiCard label="Labour Present" value={today.labour_present} sublabel={`${today.labour_absent} absent`} />
          <KpiCard label="Estimated Labour Cost" value={`₹${today.estimated_labour_cost.toLocaleString()}`} />
        </div>
      )}

      <h2 style={{ fontSize: "1.1rem" }}>Monthly Cost</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input
          type="number"
          className="form-control"
          style={{ maxWidth: 120 }}
          value={periodYear}
          onChange={(e) => setPeriodYear(e.target.valueAsNumber || now.getFullYear())}
        />
        <select className="form-control" style={{ maxWidth: 160 }} value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
      </div>
      {!monthly ? (
        <Loading />
      ) : (
        <div className="stat-cards">
          <KpiCard label="Employee Salary Cost" value={`₹${monthly.employee_salary_cost.toLocaleString()}`} />
          <KpiCard label="Labour Wage Cost" value={`₹${monthly.labour_wage_cost.toLocaleString()}`} />
          <KpiCard label="Overtime Cost" value={`₹${monthly.overtime_cost.toLocaleString()}`} />
          <KpiCard label="Advances Given" value={`₹${monthly.advances_given.toLocaleString()}`} />
          <KpiCard label="Total Paid" value={`₹${monthly.total_paid.toLocaleString()}`} />
          <KpiCard label="Total Outstanding" value={`₹${monthly.total_outstanding.toLocaleString()}`} />
        </div>
      )}
    </div>
  );
}
