import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { Loading, Empty } from "../../components/Loading";

export default function InventoryAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/analytics/inventory").then(setData);
  }, []);

  return (
    <section id="inventory" className="analytics-section">
      <div className="admin-page-head">
        <h2>Inventory Analytics</h2>
      </div>

      {!data ? (
        <Loading />
      ) : !data.has_data ? (
        <Empty>No Data Available.</Empty>
      ) : (
        <>
          <div className="stat-cards" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="num">{data.total_stock}</div>
              <div className="label">Total Stock</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.low_stock_count}</div>
              <div className="label">Low Stock</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.out_of_stock_count}</div>
              <div className="label">Out of Stock</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.fast_moving_count}</div>
              <div className="label">Fast Moving</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.slow_moving_count}</div>
              <div className="label">Slow Moving</div>
            </div>
            <div className="stat-card">
              <div className="num">{data.dead_stock_count}</div>
              <div className="label">Dead Stock</div>
            </div>
          </div>

          <div className="analytics-split-layout">
            <div>
              <h3 style={{ fontSize: "0.95rem" }}>⚠️ Low Stock Alerts</h3>
              {data.low_stock_items.length === 0 ? (
                <Empty>No low-stock plants right now.</Empty>
              ) : (
                <ul className="analytics-alert-list">
                  {data.low_stock_items.map((p) => (
                    <li key={p.id}>
                      <Link to="/admin/plants">
                        {p.name} <span className="badge badge-gold">{p.stock_quantity} left</span>
                      </Link>
                      <span className="analytics-alert-meta">{p.category_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: "0.95rem" }}>⚠️ Out of Stock</h3>
              {data.out_of_stock_items.length === 0 ? (
                <Empty>Nothing out of stock right now.</Empty>
              ) : (
                <ul className="analytics-alert-list">
                  {data.out_of_stock_items.map((p) => (
                    <li key={p.id}>
                      <Link to="/admin/plants">
                        {p.name} <span className="badge badge-muted">0 remaining</span>
                      </Link>
                      <span className="analytics-alert-meta">{p.category_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
