import CrudPage from "../CrudPage";

const fields = [
  { name: "name", label: "Name", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "price", label: "Price (₹)", type: "number", required: true },
  { name: "price_unit", label: "Price Unit", placeholder: "e.g. one-time, /month, /visit", default: "one-time" },
  { name: "features", label: "Key Features", type: "textarea", help: "One feature per line" },
  { name: "image_url", label: "Image URL", placeholder: "https://..." },
  { name: "display_order", label: "Display Order", type: "number" },
  { name: "is_active", label: "Active", type: "checkbox", checkboxLabel: "Visible on site", default: true },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "price", label: "Price", render: (item) => `₹${item.price} ${item.price_unit}` },
  { key: "is_active", label: "Active", render: (item) => (item.is_active ? "Yes" : "No") },
];

export default function Services() {
  return <CrudPage title="Service" resource="/admin/services" fields={fields} columns={columns} />;
}
