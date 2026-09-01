import { Link } from "react-router-dom";
import CrudPage from "../../CrudPage";
import { driverStatusBadgeClass } from "../../delivery/deliveryStatus";

const STATUSES = ["Active", "Inactive", "On Leave"];

export default function Drivers() {
  return (
    <CrudPage
      title="Driver"
      resource="/admin/delivery/drivers"
      idKey="id"
      searchable
      searchPlaceholder="Search by name or phone..."
      columns={[
        {
          key: "name",
          label: "Name",
          render: (item) => <Link to={`/admin/delivery/drivers/${item.id}`}>{item.name}</Link>,
        },
        { key: "phone", label: "Phone" },
        {
          key: "status",
          label: "Status",
          render: (item) => <span className={`badge ${driverStatusBadgeClass(item.status)}`}>{item.status}</span>,
        },
        { key: "total_deliveries", label: "Deliveries" },
        { key: "total_trips", label: "Trips" },
        { key: "total_km", label: "Total KM", render: (item) => `${item.total_km.toLocaleString()} km` },
      ]}
      fields={[
        { name: "name", label: "Name", type: "text", required: true },
        { name: "phone", label: "Phone", type: "text" },
        {
          name: "status",
          label: "Status",
          type: "select",
          default: "Active",
          options: STATUSES.map((s) => ({ value: s, label: s })),
        },
        { name: "joining_date", label: "Joining Date", type: "date" },
        { name: "address", label: "Address", type: "textarea" },
        { name: "emergency_contact", label: "Emergency Contact", type: "text" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      deleteConfirmMessage={(item) => `Delete driver "${item.name}"? This cannot be undone.`}
    />
  );
}
