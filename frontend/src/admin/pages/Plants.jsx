import { useEffect, useState } from "react";
import { api } from "../../api";
import CrudPage from "../CrudPage";
import { Loading } from "../../components/Loading";

const columns = [
  { key: "name", label: "Name" },
  {
    key: "image_url",
    label: "Image",
    render: (item) => (item.image_url ? <img className="thumb" src={item.image_url} alt="" /> : "-"),
  },
  { key: "price", label: "Price", render: (item) => `₹${item.price}` },
  { key: "stock_quantity", label: "Stock" },
  { key: "is_active", label: "Active", render: (item) => (item.is_active ? "Yes" : "No") },
];

export default function Plants() {
  const [categories, setCategories] = useState(null);

  useEffect(() => {
    api.get("/admin/categories").then(setCategories);
  }, []);

  if (!categories) return <Loading />;

  const fields = [
    { name: "name", label: "Name", required: true },
    {
      name: "category_id",
      label: "Category",
      type: "select",
      required: true,
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: "description", label: "Description", type: "textarea" },
    { name: "price", label: "Price (₹)", type: "number", required: true },
    { name: "discount_price", label: "Discount Price (₹, optional)", type: "number" },
    {
      name: "stock_quantity",
      label: "Stock Quantity",
      type: "number",
      help: "If tray options are added below, this is auto-calculated from their stock after saving.",
    },
    { name: "sku", label: "SKU" },
    { name: "image_url", label: "Image URL", placeholder: "https://..." },
    { name: "care_level", label: "Care Level", placeholder: "Easy / Moderate / Advanced", default: "Easy" },
    {
      name: "features",
      label: "Features",
      type: "textarea",
      help: "One feature per line",
    },
    { name: "is_featured", label: "Featured", type: "checkbox", checkboxLabel: "Show on homepage" },
    { name: "is_active", label: "Active", type: "checkbox", checkboxLabel: "Visible on site", default: true },
    {
      name: "variants",
      label: "Tray Options (optional — for Seedlings & Trays)",
      type: "variants",
      default: [],
      help: "Add one row per tray size (e.g. 125, 150). Leave empty for a normal, non-tray plant.",
    },
  ];

  return <CrudPage title="Plant" resource="/admin/plants" fields={fields} columns={columns} />;
}
