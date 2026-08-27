import { useState } from "react";
import { downloadCsv, printSection } from "./exportUtils";

// A small "Export" dropdown reused wherever a section has tabular data ready
// to export. `rows` must already be the flat array shown on screen (never
// re-fetched separately), so the export can never drift from what's visible.
export default function ExportMenu({ label = "Export", filename, rows, sectionId }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="analytics-export-menu">
      <button type="button" className="btn btn-sm btn-outline dark" onClick={() => setOpen((v) => !v)}>
        ⬇ {label}
      </button>
      {open && (
        <div className="analytics-export-dropdown">
          {rows && (
            <button
              type="button"
              onClick={() => {
                downloadCsv(filename, rows);
                setOpen(false);
              }}
            >
              Export CSV / Excel
            </button>
          )}
          {sectionId && (
            <button
              type="button"
              onClick={() => {
                printSection(sectionId);
                setOpen(false);
              }}
            >
              Print / Save as PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
