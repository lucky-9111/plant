import { Link } from "react-router-dom";
import CrudPage from "../../CrudPage";
import { labourStatusBadgeClass } from "../../labour/labourStatus";

const STATUSES = ["Active", "Inactive"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Card", "Other"];

export default function Labour() {
  return (
    <CrudPage
      title="Labour"
      resource="/admin/labour/labour"
      idKey="id"
      searchable
      searchPlaceholder="Search by name, phone, or work type..."
      columns={[
        { key: "name", label: "Name", render: (item) => <Link to={`/admin/labour/labour/${item.id}`}>{item.name}</Link> },
        { key: "work_type", label: "Work Type" },
        { key: "daily_wage", label: "Daily Wage", render: (item) => `₹${item.daily_wage.toLocaleString()}` },
        {
          key: "status",
          label: "Status",
          render: (item) => <span className={`badge ${labourStatusBadgeClass(item.status)}`}>{item.status}</span>,
        },
        {
          key: "outstanding",
          label: "Outstanding",
          render: (item) => `₹${item.outstanding.toLocaleString()}`,
        },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "phone", label: "Phone", type: "text" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "joining_date", label: "Joining Date", type: "date" },
        { name: "daily_wage", label: "Daily Wage (₹)", type: "number", required: true },
        { name: "overtime_rate", label: "Overtime Rate (₹/hour)", type: "number" },
        { name: "work_type", label: "Skill / Work Type", type: "text", placeholder: "e.g. Plant Packing" },
        {
          name: "status",
          label: "Status",
          type: "select",
          default: "Active",
          options: STATUSES.map((s) => ({ value: s, label: s })),
        },
        {
          name: "payment_method",
          label: "Payment Method",
          type: "select",
          default: "Cash",
          options: PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
        },
        { name: "bank_details", label: "Bank Details", type: "textarea" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      deleteConfirmMessage={(item) => `Delete labour worker "${item.name}"? This cannot be undone.`}
    />
  );
}
