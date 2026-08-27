import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api";
import { Loading, Empty } from "../../components/Loading";
import { rangeQuery } from "./useAnalyticsFilters";
import { WARNING_STATUSES } from "../../utils/orderStatus";
import ChartTooltip from "./ChartTooltip";

// Same 3-tier color scheme as the existing status badges elsewhere in admin
// (Orders.jsx, CustomerDetail.jsx) -- Delivered green, warning statuses gold,
// everything else muted grey. No new color system introduced.
function colorFor(status) {
  if (status === "Delivered") return "var(--color-accent)";
  if (WARNING_STATUSES.includes(status)) return "var(--color-gold)";
  return "var(--color-text-muted)";
}

export default function OrderStatusChart({ filters }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get(`/admin/analytics/order-status?${rangeQuery(filters)}`).then(setData);
  }, [filters.range, filters.dateFrom, filters.dateTo]);

  return (
    <section id="order-status" className="analytics-section">
      <div className="admin-page-head">
        <h2>Order Status Analytics</h2>
      </div>

      {!data ? (
        <Loading />
      ) : !data.has_data ? (
        <Empty>No Data Available for this period.</Empty>
      ) : (
        <div className="analytics-chart-scroll">
          <ResponsiveContainer width="100%" height={280} minWidth={560}>
            <BarChart data={data.statuses} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 12 }} width={100} />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(entry) => `${entry.payload.count} orders · ₹${entry.payload.revenue}`}
                  />
                }
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.statuses.map((s) => (
                  <Cell key={s.status} fill={colorFor(s.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
