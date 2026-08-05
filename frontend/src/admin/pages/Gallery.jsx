import CrudPage from "../CrudPage";

const fields = [
  { name: "image_url", label: "Image URL", required: true, placeholder: "https://..." },
  { name: "caption", label: "Caption" },
  { name: "category", label: "Category Tag", placeholder: "e.g. Residential, Commercial" },
  { name: "display_order", label: "Display Order", type: "number" },
];

const columns = [
  {
    key: "image_url",
    label: "Image",
    render: (item) => <img className="thumb" src={item.image_url} alt="" />,
  },
  { key: "caption", label: "Caption" },
  { key: "category", label: "Category" },
];

export default function Gallery() {
  return <CrudPage title="Gallery Image" resource="/admin/gallery" fields={fields} columns={columns} />;
}
