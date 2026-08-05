import CrudPage from "../CrudPage";

const fields = [
  { name: "question", label: "Question", required: true },
  { name: "answer", label: "Answer", type: "textarea", required: true },
  { name: "display_order", label: "Display Order", type: "number" },
  { name: "is_active", label: "Active", type: "checkbox", checkboxLabel: "Visible on site", default: true },
];

const columns = [
  { key: "question", label: "Question" },
  { key: "is_active", label: "Active", render: (item) => (item.is_active ? "Yes" : "No") },
];

export default function FAQs() {
  return <CrudPage title="FAQ" resource="/admin/faqs" fields={fields} columns={columns} />;
}
