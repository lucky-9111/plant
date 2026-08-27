import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../api";
import { Loading, Empty } from "../../components/Loading";
import { rangeQuery } from "./useAnalyticsFilters";
import ChartTooltip from "./ChartTooltip";

export default function PurchaseAnalytics({ filters }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get(`/admin/analytics/purchases?${rangeQuery(filters)}`).then(setData);
  }, [filters.range, filters.dateFrom, filters.dateTo]);

  return (
    <section id="purchases" className="analytics-section">
      <div className="admin-page-head">
        <h2>Purchase / Procurement Analytics</h2>
      </div>

      {!data ? (
        <Loading />
      ) : !data.has_data ? (
        <Empty>No Data Available. Log a purchase from the Purchases page to see cost analytics here.</Empty>
      ) : (
        <>
          <div className="stat-cards" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="num">₹{data.total_purchase_cost.toLocaleString()}</div>
              <div className="label">Total Purchase Cost</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.total_plants_purchased}</div>
              <div className="label">Total Plants Purchased</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.purchase_orders_count}</div>
              <div className="label">Purchase Orders</div>
            </div>
          </div>

          <div className="analytics-chart-scroll" style={{ marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height={200} minWidth={480}>
              <AreaChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltip formatter={(entry) => `Cost: ₹${entry.value}`} />} />
                <Area type="monotone" dataKey="total_cost" stroke="var(--color-gold)" fill="var(--color-gold)" fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="analytics-split-layout">
            <div>
              <h3 style={{ fontSize: "0.95rem" }}>Cost by Category</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_category.map((c) => (
                      <tr key={c.category_id}>
                        <td>{c.category_name}</td>
                        <td>₹{c.total_cost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: "0.95rem" }}>Cost by Plant</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Plant</th>
                      <th>Qty</th>
                      <th>Unit Cost</th>
                      <th>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_plant.map((p) => (
                      <tr key={p.plant_id}>
                        <td>{p.plant_name}</td>
                        <td>{p.quantity_purchased}</td>
                        <td>₹{p.avg_unit_cost}</td>
                        <td>₹{p.total_cost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
