import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
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
import CustomerSegmentDrawer from "./CustomerSegmentDrawer";

const SEGMENT_META = [
  { key: "vip", label: "🟢 VIP Customers" },
  { key: "regular", label: "🔵 Regular Customers" },
  { key: "new", label: "🟡 New Customers" },
  { key: "one_time", label: "⚪ One-Time Customers" },
  { key: "inactive", label: "🔴 Inactive Customers" },
];

export default function CustomerAnalytics({ filters }) {
  const [data, setData] = useState(null);
  const [registrations, setRegistrations] = useState(null);
  const [openSegment, setOpenSegment] = useState(null);

  useEffect(() => {
    api.get("/admin/analytics/customers").then(setData);
  }, []);

  useEffect(() => {
    setRegistrations(null);
    api
      .get(`/admin/analytics/customers/registrations?granularity=daily&${rangeQuery(filters)}`)
      .then(setRegistrations);
  }, [filters.range, filters.dateFrom, filters.dateTo]);

  return (
    <section id="customers" className="analytics-section">
      <div className="admin-page-head">
        <h2>Customer Analytics</h2>
      </div>

      {!data ? (
        <Loading />
      ) : !data.has_data ? (
        <Empty>No Data Available.</Empty>
      ) : (
        <>
          <div className="stat-cards" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="num">{data.total_customers}</div>
              <div className="label">Total Customers</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.new_this_month}</div>
              <div className="label">New This Month</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.new_this_week}</div>
              <div className="label">New This Week</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.retention_rate_pct}%</div>
              <div className="label">Retention Rate</div>
            </div>
            <div className="stat-card">
              <div className="num">₹{data.avg_customer_order_value}</div>
              <div className="label">Avg Order Value</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.avg_orders_per_customer}</div>
              <div className="label">Avg Orders / Customer</div>
            </div>
          </div>

          <div className="analytics-segment-cards">
            {SEGMENT_META.map((s) => (
              <button
                type="button"
                key={s.key}
                className="stat-card analytics-segment-card"
                onClick={() => setOpenSegment(s.key)}
              >
                <div className="num">{data.segments[s.key]}</div>
                <div className="label">{s.label}</div>
              </button>
            ))}
          </div>

          <h3 style={{ fontSize: "1rem", marginTop: 24 }}>New Customer Registrations</h3>
          {!registrations ? (
            <Loading />
          ) : !registrations.has_data ? (
            <Empty>No Data Available for this period.</Empty>
          ) : (
            <div className="analytics-chart-scroll">
              <ResponsiveContainer width="100%" height={220} minWidth={480}>
                <BarChart data={registrations.points}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    content={<ChartTooltip formatter={(entry) => `New customers: ${entry.value}`} />}
                  />
                  <Bar dataKey="new_customers" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      <CustomerSegmentDrawer segment={openSegment} onClose={() => setOpenSegment(null)} />
    </section>
  );
}
