import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";
import { useAnalyticsFilters, rangeQuery } from "../../analytics/useAnalyticsFilters";
import DateRangePicker from "../../analytics/DateRangePicker";
import KpiCard from "../../analytics/KpiCard";

export default function AccountingOverview() {
  const filters = useAnalyticsFilters();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    setSummary(null);
    api.get(`/admin/accounting/overview?${rangeQuery(filters)}`).then(setSummary);
  }, [filters.range, filters.dateFrom, filters.dateTo]);

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Accounting Overview</h1>
          <p style={{ color: "var(--color-text-muted)", margin: "4px 0 0", fontSize: "0.9rem" }}>
            Combined online + offline financial snapshot
          </p>
        </div>
        <DateRangePicker
          range={filters.range}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onRangeChange={filters.setRange}
          onFromChange={filters.setDateFrom}
          onToChange={filters.setDateTo}
        />
      </div>

      {!summary ? (
        <Loading />
      ) : !summary.has_data ? (
        <Empty>No accounting activity yet for {summary.range_label}. Record a sales order or wait for a website order to sync in.</Empty>
      ) : (
        <>
          <div className="stat-cards" style={{ marginBottom: 28 }}>
            <KpiCard
              label="Total Sales"
              value={`₹${summary.total_sales.toLocaleString()}`}
              sublabel={`₹${summary.online_sales.toLocaleString()} online · ₹${summary.offline_sales.toLocaleString()} offline`}
            />
            <KpiCard label="Total Purchases" value={`₹${summary.total_purchases.toLocaleString()}`} sublabel={summary.range_label} />
            <KpiCard label="Receivables" value={`₹${summary.receivables.toLocaleString()}`} sublabel="Open invoices, all time" />
            <KpiCard label="Payables" value={`₹${summary.payables.toLocaleString()}`} sublabel="Open bills, all time" />
            <KpiCard
              label="Net Profit"
              value={summary.net_profit != null ? `₹${summary.net_profit.toLocaleString()}` : "N/A"}
              sublabel={summary.net_profit != null ? summary.range_label : "Log a purchase to see profit"}
            />
            <KpiCard
              label="Invoices"
              value={summary.pending_invoices + summary.paid_invoices}
              sublabel={`${summary.paid_invoices} paid · ${summary.pending_invoices} pending`}
            />
            <KpiCard label="Pending Bills" value={summary.pending_bills} />
            <KpiCard label="New Contacts" value={summary.new_contacts_this_period} sublabel={summary.range_label} />
          </div>
        </>
      )}
    </div>
  );
}
