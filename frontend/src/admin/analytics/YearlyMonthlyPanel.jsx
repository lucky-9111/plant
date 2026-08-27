import { useEffect, useState } from "react";
import { api } from "../../api";
import { Loading, Empty } from "../../components/Loading";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

export default function YearlyMonthlyPanel() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get(`/admin/analytics/yearly?year=${year}`).then(setData);
  }, [year]);

  return (
    <section id="yearly" className="analytics-section">
      <div className="admin-page-head">
        <h2>Yearly / Monthly Analytics</h2>
        <select className="form-control" style={{ width: 120 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {!data ? (
        <Loading />
      ) : !data.year.has_data ? (
        <Empty>No Data Available for {year}.</Empty>
      ) : (
        <>
          <div className="stat-cards" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="num">₹{data.year.total_revenue.toLocaleString()}</div>
              <div className="label">Total Revenue</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.year.total_orders}</div>
              <div className="label">Total Orders</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.year.total_plants_sold}</div>
              <div className="label">Plants Sold</div>
            </div>
            <div className="stat-card">
              <div className="num">₹{data.year.total_purchase_cost.toLocaleString()}</div>
              <div className="label">Purchase Cost</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.year.gross_profit != null ? `₹${data.year.gross_profit.toLocaleString()}` : "N/A"}</div>
              <div className="label">Gross Profit</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.year.new_customers}</div>
              <div className="label">New Customers</div>
            </div>
            <div className="stat-card">
              <div className="num">₹{data.year.avg_order_value}</div>
              <div className="label">Avg Order Value</div>
            </div>
          </div>

          {data.previous_year && (
            <div className="analytics-yoy-row">
              <span>
                {year - 1}: ₹{data.previous_year.total_revenue.toLocaleString()}
              </span>
              <span>→</span>
              <span>
                {year}: ₹{data.year.total_revenue.toLocaleString()}
              </span>
              {data.growth_pct != null && (
                <span className={data.growth_pct >= 0 ? "analytics-kpi-trend-up" : "analytics-kpi-trend-down"}>
                  {data.growth_pct >= 0 ? "▲" : "▼"} {Math.abs(data.growth_pct)}% YoY
                </span>
              )}
            </div>
          )}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Orders</th>
                  <th>Plants Sold</th>
                  <th>Revenue</th>
                  <th>Purchase Cost</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => (
                  <tr key={m.month}>
                    <td>{m.label}</td>
                    <td>{m.orders}</td>
                    <td>{m.plants_sold}</td>
                    <td>₹{m.revenue.toLocaleString()}</td>
                    <td>₹{m.purchase_cost.toLocaleString()}</td>
                    <td>{m.profit != null ? `₹${m.profit.toLocaleString()}` : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
