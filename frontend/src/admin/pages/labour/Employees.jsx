import { Link } from "react-router-dom";
import CrudPage from "../../CrudPage";
import { employeeStatusBadgeClass } from "../../labour/labourStatus";

const STATUSES = ["Active", "Inactive", "On Leave", "Terminated"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Card", "Other"];

export default function Employees() {
  return (
    <CrudPage
      title="Employee"
      resource="/admin/labour/employees"
      idKey="id"
      searchable
      searchPlaceholder="Search by name, phone, or department..."
      columns={[
        { key: "name", label: "Name", render: (item) => <Link to={`/admin/labour/employees/${item.id}`}>{item.name}</Link> },
        { key: "role", label: "Designation" },
        { key: "department", label: "Department" },
        { key: "salary", label: "Monthly Salary", render: (item) => `₹${item.salary.toLocaleString()}` },
        {
          key: "status",
          label: "Status",
          render: (item) => <span className={`badge ${employeeStatusBadgeClass(item.status)}`}>{item.status}</span>,
        },
        {
          key: "outstanding",
          label: "Outstanding",
          render: (item) => `₹${item.outstanding.toLocaleString()}`,
        },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "role", label: "Designation", type: "text" },
        { name: "department", label: "Department", type: "text" },
        { name: "email", label: "Email", type: "text" },
        { name: "phone", label: "Phone", type: "text" },
        { name: "joining_date", label: "Joining Date", type: "date" },
        { name: "salary", label: "Monthly Salary (₹)", type: "number", required: true },
        { name: "overtime_rate", label: "Overtime Rate (₹/hour)", type: "number" },
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
      deleteConfirmMessage={(item) => `Delete employee "${item.name}"? This cannot be undone.`}
    />
  );
}
