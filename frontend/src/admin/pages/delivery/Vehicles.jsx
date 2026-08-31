import { Link } from "react-router-dom";
import CrudPage from "../../CrudPage";
import { vehicleStatusBadgeClass } from "../../delivery/deliveryStatus";

const STATUSES = ["Available", "On Trip", "Maintenance", "Inactive"];
const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric"];

export default function Vehicles() {
  return (
    <CrudPage
      title="Vehicle"
      resource="/admin/delivery/vehicles"
      idKey="id"
      searchable
      searchPlaceholder="Search by registration or model..."
      columns={[
        {
          key: "registration_number",
          label: "Registration",
          render: (item) => <Link to={`/admin/delivery/vehicles/${item.id}`}>{item.registration_number}</Link>,
        },
        { key: "name_model", label: "Model" },
        { key: "fuel_type", label: "Fuel" },
        { key: "current_km_reading", label: "Current KM", render: (item) => `${item.current_km_reading.toLocaleString()} km` },
        {
          key: "status",
          label: "Status",
          render: (item) => <span className={`badge ${vehicleStatusBadgeClass(item.status)}`}>{item.status}</span>,
        },
        { key: "total_trips", label: "Trips" },
      ]}
      fields={[
        { name: "registration_number", label: "Registration Number", type: "text", required: true },
        { name: "name_model", label: "Vehicle Name / Model", type: "text" },
        { name: "vehicle_type", label: "Vehicle Type", type: "text", placeholder: "e.g. Mini Truck" },
        {
          name: "fuel_type",
          label: "Fuel Type",
          type: "select",
          default: "Petrol",
          options: FUEL_TYPES.map((f) => ({ value: f, label: f })),
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          default: "Available",
          options: STATUSES.map((s) => ({ value: s, label: s })),
        },
        { name: "current_km_reading", label: "Current KM Reading", type: "number" },
        { name: "insurance_expiry", label: "Insurance Expiry", type: "date" },
        { name: "puc_expiry", label: "PUC Expiry", type: "date" },
        { name: "service_due", label: "Service Due", type: "date" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      deleteConfirmMessage={(item) => `Delete vehicle "${item.registration_number}"? This cannot be undone.`}
    />
  );
}
