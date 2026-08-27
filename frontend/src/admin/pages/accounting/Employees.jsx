import CrudPage from "../../CrudPage";

export default function Employees() {
  return (
    <CrudPage
      title="Employee"
      resource="/admin/accounting/employees"
      idKey="id"
      columns={[
        { key: "name", label: "Name" },
        { key: "role", label: "Role" },
        { key: "phone", label: "Phone" },
        { key: "salary", label: "Salary", render: (item) => `₹${item.salary.toLocaleString()}` },
        {
          key: "is_active",
          label: "Active",
          render: (item) => (item.is_active ? "Yes" : "No"),
        },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "role", label: "Role / Designation", type: "text" },
        { name: "email", label: "Email", type: "text" },
        { name: "phone", label: "Phone", type: "text" },
        { name: "salary", label: "Salary (₹)", type: "number" },
        { name: "joining_date", label: "Joining Date", type: "date", required: true },
        { name: "notes", label: "Notes", type: "textarea" },
        { name: "is_active", label: "Active", type: "checkbox", default: true },
      ]}
      deleteConfirmMessage={(item) => `Delete employee "${item.name}"? This cannot be undone.`}
    />
  );
}
