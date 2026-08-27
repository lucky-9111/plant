import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../api";
import { Loading, Empty } from "../../components/Loading";
import { rangeQuery } from "./useAnalyticsFilters";
import ChartTooltip from "./ChartTooltip";

export default function ProfitAnalytics({ filters }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get(`/admin/analytics/profit?${rangeQuery(filters)}`).then(setData);
  }, [filters.range, filters.dateFrom, filters.dateTo]);

  return (
    <section id="profit" className="analytics-section">
      <div className="admin-page-head">
        <h2>Profit Analytics</h2>
      </div>

      {!data ? (
        <Loading />
      ) : !data.has_data ? (
        <Empty>No Data Available for this period.</Empty>
      ) : (
        <>
          <div className="stat-cards" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="num">₹{data.total_revenue.toLocaleString()}</div>
              <div className="label">Revenue</div>
            </div>
            <div className="stat-card">
              <div className="num">₹{data.total_purchase_cost.toLocaleString()}</div>
              <div className="label">Purchase Cost</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.gross_profit != null ? `₹${data.gross_profit.toLocaleString()}` : "N/A"}</div>
              <div className="label">Gross Profit</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.profit_margin_pct != null ? `${data.profit_margin_pct}%` : "N/A"}</div>
              <div className="label">Profit Margin</div>
            </div>
          </div>

          {data.by_month.length > 0 && (
            <div className="analytics-chart-scroll" style={{ marginBottom: 20 }}>
              <ResponsiveContainer width="100%" height={220} minWidth={480}>
                <LineChart data={data.by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(entry) =>
                          entry.dataKey === "revenue" ? `Revenue: ₹${entry.value}` : `Profit: ₹${entry.value}`
                        }
                      />
                    }
                  />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <h3 style={{ fontSize: "0.95rem" }}>Profit by Category</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Revenue</th>
                  <th>Purchase Cost</th>
                  <th>Profit</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.by_category.map((c) => (
                  <tr key={c.category_id}>
                    <td>{c.category_name}</td>
                    <td>₹{c.revenue.toLocaleString()}</td>
                    <td>{c.purchase_cost != null ? `₹${c.purchase_cost.toLocaleString()}` : "N/A"}</td>
                    <td>{c.profit != null ? `₹${c.profit.toLocaleString()}` : "N/A"}</td>
                    <td>{c.profit_pct != null ? `${c.profit_pct}%` : "N/A"}</td>
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
