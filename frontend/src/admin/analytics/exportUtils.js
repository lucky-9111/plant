// Hand-rolled CSV export -- no dependency needed, and Excel opens .csv files
// natively, so this covers both "Export CSV" and "Export Excel" without
// pulling in a library (SheetJS/xlsx has unpatched high-severity CVEs as of
// this writing -- prototype pollution + ReDoS -- so it's deliberately not
// used here; a real .xlsx binary isn't worth that risk for a report export).
export function downloadCsv(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function printWholePage() {
  window.print();
}

export function printSection(sectionId) {
  const el = sectionId ? document.getElementById(sectionId) : null;
  if (!el) return window.print();
  document.body.classList.add("analytics-print-mode");
  document.querySelectorAll(".analytics-section").forEach((s) => {
    s.style.display = s.id === sectionId ? "" : "none";
  });
  window.print();
  setTimeout(() => {
    document.querySelectorAll(".analytics-section").forEach((s) => {
      s.style.display = "";
    });
    document.body.classList.remove("analytics-print-mode");
  }, 300);
}
