import CrudPage from "../CrudPage";

const fields = [
  { name: "name", label: "Name", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "image_url", label: "Image URL", placeholder: "https://..." },
  { name: "display_order", label: "Display Order", type: "number" },
];

const columns = [
  { key: "name", label: "Name" },
  {
    key: "image_url",
    label: "Image",
    render: (item) => (item.image_url ? <img className="thumb" src={item.image_url} alt="" /> : "-"),
  },
  { key: "display_order", label: "Order" },
];

export default function Categories() {
  return <CrudPage title="Category" resource="/admin/categories" fields={fields} columns={columns} />;
}
