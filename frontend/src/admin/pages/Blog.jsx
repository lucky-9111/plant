import CrudPage from "../CrudPage";

const fields = [
  { name: "title", label: "Title", required: true },
  { name: "excerpt", label: "Excerpt", type: "textarea" },
  { name: "content", label: "Content", type: "textarea", required: true },
  { name: "image_url", label: "Image URL", placeholder: "https://..." },
  { name: "is_published", label: "Published", type: "checkbox", checkboxLabel: "Visible on site", default: true },
];

const columns = [
  { key: "title", label: "Title" },
  { key: "is_published", label: "Published", render: (item) => (item.is_published ? "Yes" : "No") },
];

export default function Blog() {
  return <CrudPage title="Blog Post" resource="/admin/blog" fields={fields} columns={columns} />;
}
