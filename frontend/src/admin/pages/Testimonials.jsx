import CrudPage from "../CrudPage";

const fields = [
  { name: "customer_name", label: "Customer Name", required: true },
  { name: "rating", label: "Rating (1-5)", type: "number", default: 5 },
  { name: "message", label: "Message", type: "textarea", required: true },
  { name: "image_url", label: "Customer Photo URL", placeholder: "https://..." },
  { name: "is_approved", label: "Approved", type: "checkbox", checkboxLabel: "Visible on site", default: true },
];

const columns = [
  { key: "customer_name", label: "Customer" },
  { key: "rating", label: "Rating" },
  { key: "is_approved", label: "Approved", render: (item) => (item.is_approved ? "Yes" : "No") },
];

export default function Testimonials() {
  return <CrudPage title="Testimonial" resource="/admin/testimonials" fields={fields} columns={columns} />;
}
