import { useEffect, useState } from "react";
import { api } from "../../api";
import { Loading, Empty } from "../../components/Loading";

const CARDS = [
  { key: "best_selling_day", label: "Best Selling Day" },
  { key: "highest_revenue_day", label: "Highest Revenue Day" },
  { key: "best_selling_month", label: "Best Selling Month" },
  { key: "highest_revenue_month", label: "Highest Revenue Month" },
  { key: "best_selling_category", label: "Best Selling Category" },
  { key: "best_selling_plant", label: "Best Selling Plant" },
  { key: "highest_spending_customer", label: "Highest Spending Customer" },
  { key: "most_frequent_customer", label: "Most Frequent Customer" },
];

export default function SalesTrends() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/analytics/trends").then(setData);
  }, []);

  return (
    <section id="trends" className="analytics-section">
      <div className="admin-page-head">
        <h2>Sales Trends</h2>
      </div>

      {!data ? (
        <Loading />
      ) : !data.has_data ? (
        <Empty>No Data Available.</Empty>
      ) : (
        <div className="stat-cards">
          {CARDS.map((c) => {
            const leader = data[c.key];
            return (
              <div className="stat-card" key={c.key}>
                <div className="num" style={{ fontSize: "1.15rem" }}>
                  {leader ? leader.label : "N/A"}
                </div>
                <div className="label">{c.label}</div>
                {leader && <div className="analytics-kpi-sublabel">{leader.value}</div>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
