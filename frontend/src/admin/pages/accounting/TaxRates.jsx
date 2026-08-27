import CrudPage from "../../CrudPage";

export default function TaxRates() {
  return (
    <CrudPage
      title="Tax Rate"
      resource="/admin/accounting/tax-rates"
      idKey="id"
      columns={[
        { key: "name", label: "Name" },
        { key: "rate_percent", label: "Rate (%)" },
        {
          key: "is_active",
          label: "Active",
          render: (item) => (item.is_active ? "Yes" : "No"),
        },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. GST 18%" },
        { name: "rate_percent", label: "Rate (%)", type: "number", required: true },
        { name: "is_active", label: "Active", type: "checkbox", default: true },
      ]}
      deleteConfirmMessage={(item) => `Delete tax rate "${item.name}"? This cannot be undone.`}
    />
  );
}
