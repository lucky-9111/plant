import CrudPage from "../../CrudPage";

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Income", "Expense"];

export default function ChartOfAccounts() {
  return (
    <CrudPage
      title="Account"
      resource="/admin/accounting/accounts"
      idKey="id"
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "account_type", label: "Type" },
        {
          key: "is_active",
          label: "Active",
          render: (item) => (item.is_active ? "Yes" : "No"),
        },
      ]}
      fields={[
        { name: "code", label: "Code", type: "text", required: true, placeholder: "e.g. 1000" },
        { name: "name", label: "Name", type: "text", required: true },
        {
          name: "account_type",
          label: "Type",
          type: "select",
          required: true,
          options: ACCOUNT_TYPES.map((t) => ({ value: t, label: t })),
        },
        { name: "description", label: "Description", type: "textarea" },
        { name: "is_active", label: "Active", type: "checkbox", default: true },
      ]}
      deleteConfirmMessage={(item) => `Delete account "${item.name}"? This cannot be undone.`}
    />
  );
}
