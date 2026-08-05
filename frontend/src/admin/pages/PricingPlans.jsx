import CrudPage from "../CrudPage";

const fields = [
  { name: "name", label: "Plan Name", required: true },
  { name: "price", label: "Price (₹)", type: "number", required: true },
  {
    name: "billing_cycle",
    label: "Billing Cycle",
    type: "select",
    options: [
      { value: "monthly", label: "Monthly" },
      { value: "yearly", label: "Yearly" },
      { value: "one-time", label: "One-time" },
    ],
    default: "monthly",
  },
  { name: "features", label: "Features", type: "textarea", help: "One feature per line" },
  { name: "is_featured", label: "Featured", type: "checkbox", checkboxLabel: "Highlight as most popular" },
  { name: "display_order", label: "Display Order", type: "number" },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "price", label: "Price", render: (item) => `₹${item.price} / ${item.billing_cycle}` },
  { key: "is_featured", label: "Featured", render: (item) => (item.is_featured ? "Yes" : "No") },
];

export default function PricingPlans() {
  return <CrudPage title="Pricing Plan" resource="/admin/pricing-plans" fields={fields} columns={columns} />;
}
