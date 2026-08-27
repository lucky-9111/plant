import CrudPage from "../../CrudPage";
import { sourceBadgeClass } from "../../accounting/accountingStatus";

export default function Contacts() {
  return (
    <CrudPage
      title="Contact"
      resource="/admin/accounting/contacts"
      idKey="id"
      exportUrl="/api/admin/accounting/export/contacts.xlsx"
      searchable
      searchPlaceholder="Search by name, email, or phone..."
      columns={[
        { key: "name", label: "Name" },
        { key: "contact_type", label: "Type" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        {
          key: "source",
          label: "Source",
          render: (item) => (
            <span className={`badge ${sourceBadgeClass(item.source)}`}>
              {item.source === "online" ? "Online" : "Offline"}
            </span>
          ),
        },
        {
          key: "outstanding",
          label: "Outstanding",
          render: (item) => `₹${item.outstanding.toLocaleString()}`,
        },
      ]}
      fields={[
        {
          name: "contact_type",
          label: "Type",
          type: "select",
          required: true,
          default: "customer",
          options: [
            { value: "customer", label: "Customer" },
            { value: "supplier", label: "Supplier" },
            { value: "both", label: "Both" },
          ],
        },
        { name: "name", label: "Name", type: "text", required: true },
        { name: "email", label: "Email", type: "text" },
        { name: "phone", label: "Phone", type: "text" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "gstin", label: "GSTIN", type: "text" },
        { name: "is_active", label: "Active", type: "checkbox", default: true },
      ]}
      allowEdit={(item) => item.source !== "online"}
      allowDelete={(item) => item.source !== "online"}
      deleteConfirmMessage={(item) => `Delete contact "${item.name}"? This cannot be undone.`}
    />
  );
}
