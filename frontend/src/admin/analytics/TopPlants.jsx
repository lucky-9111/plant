import { useEffect, useState } from "react";
import { api } from "../../api";
import { Loading, Empty } from "../../components/Loading";
import { rangeQuery } from "./useAnalyticsFilters";

const MEDALS = ["🏆", "🥈", "🥉"];

export default function TopPlants({ filters, onSelectPlant }) {
  const [limit, setLimit] = useState(5);
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    const params = new URLSearchParams(rangeQuery(filters));
    params.set("sort_by", "revenue");
    params.set("sort_dir", "desc");
    params.set("limit", limit === "all" ? 200 : limit);
    params.set("page", 1);
    api.get(`/admin/analytics/plants?${params.toString()}`).then(setData);
  }, [filters.range, filters.dateFrom, filters.dateTo, limit]);

  return (
    <section id="top-plants" className="analytics-section">
      <div className="admin-page-head">
        <h2>Top Best-Selling Plants</h2>
        <div className="analytics-toggle-group">
          {[5, 10, "all"].map((v) => (
            <button
              key={v}
              type="button"
              className={`btn btn-sm ${limit === v ? "btn-primary" : "btn-outline dark"}`}
              onClick={() => setLimit(v)}
            >
              {v === "all" ? "All" : `Top ${v}`}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <Loading />
      ) : !data.has_data || !data.items.some((p) => p.total_sold > 0) ? (
        <Empty>No Data Available for this period.</Empty>
      ) : (
        <div className="analytics-top-plants-list">
          {data.items
            .filter((p) => p.total_sold > 0)
            .map((p, i) => (
              <button
                type="button"
                key={p.id}
                className="analytics-top-plant-row"
                onClick={() => onSelectPlant?.(p.id)}
              >
                <span className="analytics-top-plant-rank">{MEDALS[i] || `#${i + 1}`}</span>
                <img src={p.image_url} alt="" className="analytics-top-plant-img" />
                <span className="analytics-top-plant-info">
                  <strong>{p.name}</strong>
                  <span className="analytics-top-plant-meta">{p.category_name}</span>
                </span>
                <span className="analytics-top-plant-stats">
                  <span>Sold: {p.total_sold}</span>
                  <span>Revenue: ₹{p.total_revenue.toLocaleString()}</span>
                  <span>Orders: {p.order_count}</span>
                  <span>Stock: {p.stock_quantity}</span>
                </span>
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
