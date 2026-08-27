import { useEffect, useState } from "react";
import { api } from "../../../api";
import { Loading, Empty } from "../../../components/Loading";
import DateRangePicker from "../../analytics/DateRangePicker";
import KpiCard from "../../analytics/KpiCard";
import ExportButton from "../../accounting/ExportButton";

const REPORTS = [
  { id: "sales", label: "Sales Report", ranged: true },
  { id: "purchases", label: "Purchase Report", ranged: true },
  { id: "expenses", label: "Expense Report", ranged: true },
  { id: "profit-loss", label: "Profit & Loss", ranged: true },
  { id: "balance-sheet", label: "Balance Sheet", ranged: false },
  { id: "cash-flow", label: "Cash Flow", ranged: true },
  { id: "receivables-aging", label: "Receivables Aging", ranged: false },
  { id: "payables-aging", label: "Payables Aging", ranged: false },
  { id: "customer-outstanding", label: "Customer Outstanding", ranged: false },
  { id: "supplier-outstanding", label: "Supplier Outstanding", ranged: false },
  { id: "tax", label: "Tax Report", ranged: true },
  { id: "item-sales", label: "Item-wise Sales", ranged: true },
  { id: "payments", label: "Payments Ledger", ranged: true },
];

function money(n) {
  return `₹${(n || 0).toLocaleString()}`;
}

export default function Reports() {
  const [activeId, setActiveId] = useState("sales");
  const [range, setRange] = useState("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState(null);

  const active = REPORTS.find((r) => r.id === activeId);

  useEffect(() => {
    setData(null);
    const params = new URLSearchParams();
    if (active.ranged) {
      params.set("range", range);
      if (range === "custom") {
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
      }
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    api.get(`/admin/accounting/reports/${activeId}${query}`).then(setData);
  }, [activeId, range, dateFrom, dateTo]);

  return (
    <div>
      <div className="admin-page-head">
        <h1>Reports</h1>
        {active.ranged && (
          <DateRangePicker
            range={range}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRangeChange={setRange}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
          />
        )}
      </div>

      <nav className="analytics-jump-nav" style={{ marginBottom: 20 }}>
        {REPORTS.map((r) => (
          <a
            key={r.id}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveId(r.id);
            }}
            style={r.id === activeId ? { fontWeight: 700, textDecoration: "underline" } : undefined}
          >
            {r.label}
          </a>
        ))}
      </nav>

      {!data ? <Loading /> : <ReportBody id={activeId} data={data} />}
    </div>
  );
}

function ReportTable({ columns, rows, emptyMessage }) {
  if (!rows || rows.length === 0) return <Empty>{emptyMessage || "No data for this period."}</Empty>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportBody({ id, data }) {
  switch (id) {
    case "sales":
      return (
        <>
          <div className="stat-cards" style={{ marginBottom: 24 }}>
            <KpiCard label="Total Sales" value={money(data.total_sales)} sublabel={data.range_label} />
            <KpiCard label="Online Sales" value={money(data.online_sales)} />
            <KpiCard label="Offline Sales" value={money(data.offline_sales)} />
            <KpiCard label="Invoices" value={data.invoice_count} />
          </div>
          <ReportTable
            columns={[
              { key: "period", label: "Month" },
              { key: "amount", label: "Sales", render: (r) => money(r.amount) },
              { key: "count", label: "Invoices" },
            ]}
            rows={data.rows}
          />
        </>
      );
    case "purchases":
      return (
        <>
          <div className="stat-cards" style={{ marginBottom: 24 }}>
            <KpiCard label="Total Purchases" value={money(data.total_purchases)} sublabel={data.range_label} />
            <KpiCard label="Bills" value={data.bill_count} />
          </div>
          <ReportTable
            columns={[
              { key: "period", label: "Month" },
              { key: "amount", label: "Purchases", render: (r) => money(r.amount) },
              { key: "count", label: "Bills" },
            ]}
            rows={data.rows}
          />
        </>
      );
    case "expenses":
      return (
        <>
          <div className="stat-cards" style={{ marginBottom: 24 }}>
            <KpiCard label="Total Expenses" value={money(data.total_expenses)} sublabel={data.range_label} />
            <KpiCard label="Expense Entries" value={data.expense_count} />
          </div>
          <ReportTable
            columns={[
              { key: "label", label: "Category" },
              { key: "amount", label: "Amount", render: (r) => money(r.amount) },
              { key: "count", label: "Count" },
            ]}
            rows={data.rows}
          />
        </>
      );
    case "profit-loss":
      return (
        <div className="stat-cards">
          <KpiCard label="Income" value={money(data.income)} sublabel={data.range_label} />
          <KpiCard label="Cost of Goods (Purchases)" value={money(data.cogs)} />
          <KpiCard label="Gross Profit" value={money(data.gross_profit)} />
          <KpiCard label="Expenses" value={money(data.expenses)} />
          <KpiCard label="Net Profit" value={money(data.net_profit)} />
        </div>
      );
    case "balance-sheet":
      return (
        <>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            As of {new Date(data.as_of).toLocaleString()}. This is a simplified summary (no full double-entry
            ledger), not an audited statement -- inventory value is an estimate from historical purchase cost.
          </p>
          <div className="stat-cards">
            <KpiCard label="Receivables" value={money(data.receivables)} />
            <KpiCard label="Inventory Value (est.)" value={money(data.inventory_value)} />
            <KpiCard label="Total Assets" value={money(data.total_assets)} />
            <KpiCard label="Total Liabilities (Payables)" value={money(data.total_liabilities)} />
            <KpiCard label="Retained Earnings" value={money(data.retained_earnings)} />
            <KpiCard label="Total Equity" value={money(data.total_equity)} />
          </div>
        </>
      );
    case "cash-flow":
      return (
        <>
          <div className="stat-cards" style={{ marginBottom: 24 }}>
            <KpiCard label="Cash In" value={money(data.total_in)} sublabel={data.range_label} />
            <KpiCard label="Cash Out" value={money(data.total_out)} />
            <KpiCard label="Net Cash Flow" value={money(data.net)} />
          </div>
          <ReportTable
            columns={[
              { key: "period", label: "Month" },
              { key: "cash_in", label: "Cash In", render: (r) => money(r.cash_in) },
              { key: "cash_out", label: "Cash Out", render: (r) => money(r.cash_out) },
              { key: "net", label: "Net", render: (r) => money(r.net) },
            ]}
            rows={data.rows}
          />
        </>
      );
    case "receivables-aging":
    case "payables-aging":
      return (
        <>
          <div className="stat-cards" style={{ marginBottom: 24 }}>
            <KpiCard label="Current" value={money(data.current)} />
            <KpiCard label="0-30 Days" value={money(data.days_0_30)} />
            <KpiCard label="31-60 Days" value={money(data.days_31_60)} />
            <KpiCard label="61-90 Days" value={money(data.days_61_90)} />
            <KpiCard label="90+ Days" value={money(data.days_90_plus)} />
            <KpiCard label="Total" value={money(data.total)} />
          </div>
          <ReportTable
            columns={[
              { key: "number", label: "Document #" },
              { key: "contact_name", label: id === "receivables-aging" ? "Customer" : "Supplier / Payee" },
              { key: "days_overdue", label: "Days Overdue" },
              { key: "balance_due", label: "Balance Due", render: (r) => money(r.balance_due) },
            ]}
            rows={data.rows}
            emptyMessage="Nothing outstanding."
          />
        </>
      );
    case "customer-outstanding":
      return (
        <>
          <div className="stat-cards" style={{ marginBottom: 24 }}>
            <KpiCard label="Total Outstanding" value={money(data.total_outstanding)} />
          </div>
          <ReportTable
            columns={[
              { key: "name", label: "Customer" },
              { key: "total", label: "Total Sales", render: (r) => money(r.total) },
              { key: "paid", label: "Paid", render: (r) => money(r.paid) },
              { key: "outstanding", label: "Outstanding", render: (r) => money(r.outstanding) },
            ]}
            rows={data.rows}
            emptyMessage="No outstanding customer balances."
          />
        </>
      );
    case "supplier-outstanding":
      return (
        <>
          <div className="stat-cards" style={{ marginBottom: 24 }}>
            <KpiCard label="Total Payable" value={money(data.total_payable)} />
          </div>
          <ReportTable
            columns={[
              { key: "name", label: "Supplier" },
              { key: "total", label: "Total Purchases", render: (r) => money(r.total) },
              { key: "paid", label: "Paid", render: (r) => money(r.paid) },
              { key: "outstanding", label: "Payable", render: (r) => money(r.outstanding) },
            ]}
            rows={data.rows}
            emptyMessage="No outstanding supplier balances."
          />
        </>
      );
    case "tax":
      return (
        <>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            Output tax only -- Bills don't yet track per-line tax (only Purchase Orders do, before conversion),
            so there is no input-tax figure to net against yet.
          </p>
          <div className="stat-cards" style={{ marginBottom: 24 }}>
            <KpiCard label="Output Tax (Collected)" value={money(data.total_output_tax)} sublabel={data.range_label} />
            <KpiCard label="Input Tax (Paid)" value={money(data.total_input_tax)} />
            <KpiCard label="Net Tax" value={money(data.net_tax)} />
          </div>
          <ReportTable
            columns={[
              { key: "name", label: "Tax Rate" },
              { key: "rate_percent", label: "Rate %" },
              { key: "output_tax", label: "Output Tax", render: (r) => money(r.output_tax) },
              { key: "input_tax", label: "Input Tax", render: (r) => money(r.input_tax) },
              { key: "net_tax", label: "Net Tax", render: (r) => money(r.net_tax) },
            ]}
            rows={data.rows}
          />
        </>
      );
    case "item-sales":
      return (
        <>
          <div className="stat-cards" style={{ marginBottom: 24 }}>
            <KpiCard label="Total Quantity Sold" value={data.total_quantity} sublabel={data.range_label} />
            <KpiCard label="Total Revenue" value={money(data.total_revenue)} />
          </div>
          <ReportTable
            columns={[
              { key: "name", label: "Item" },
              { key: "quantity", label: "Qty Sold" },
              { key: "revenue", label: "Revenue", render: (r) => money(r.revenue) },
              { key: "online_quantity", label: "Online Qty" },
              { key: "offline_quantity", label: "Offline Qty" },
            ]}
            rows={data.rows}
          />
        </>
      );
    case "payments":
      return (
        <>
          <div style={{ marginBottom: 12 }}>
            <ExportButton baseUrl="/api/admin/accounting/export/payments.xlsx" label="Export Payments" />
          </div>
          <div className="stat-cards" style={{ marginBottom: 24 }}>
            <KpiCard label="Total In" value={money(data.total_in)} sublabel={data.range_label} />
            <KpiCard label="Total Out" value={money(data.total_out)} />
            <KpiCard label="Net" value={money(data.net)} />
          </div>
          <ReportTable
            columns={[
              { key: "date", label: "Date", render: (r) => new Date(r.date).toLocaleDateString() },
              { key: "direction", label: "Direction", render: (r) => (r.direction === "in" ? "In" : "Out") },
              { key: "method", label: "Method" },
              { key: "contact_name", label: "Contact" },
              { key: "amount", label: "Amount", render: (r) => money(r.amount) },
            ]}
            rows={data.rows}
          />
        </>
      );
    default:
      return null;
  }
}
