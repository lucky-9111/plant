const OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
  { value: "custom", label: "Custom" },
];

export default function DateRangePicker({ range, dateFrom, dateTo, onRangeChange, onFromChange, onToChange }) {
  return (
    <div className="analytics-range-picker">
      <select className="form-control" value={range} onChange={(e) => onRangeChange(e.target.value)}>
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {range === "custom" && (
        <>
          <input
            type="date"
            className="form-control"
            value={dateFrom}
            onChange={(e) => onFromChange(e.target.value)}
          />
          <span>to</span>
          <input
            type="date"
            className="form-control"
            value={dateTo}
            onChange={(e) => onToChange(e.target.value)}
          />
        </>
      )}
    </div>
  );
}
