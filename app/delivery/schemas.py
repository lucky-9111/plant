from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ---------- Driver ----------

class DriverIn(BaseModel):
    name: str
    phone: str = ""
    status: str = "Active"
    assigned_vehicle_id: Optional[int] = None
    joining_date: Optional[datetime] = None
    address: str = ""
    emergency_contact: str = ""
    notes: str = ""


class DriverOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    status: str
    assigned_vehicle_id: Optional[int] = None
    joining_date: Optional[datetime] = None
    address: str
    emergency_contact: str
    notes: str
    created_at: datetime
    # Computed
    total_deliveries: int = 0
    total_trips: int = 0
    total_km: float = 0


# ---------- Vehicle ----------

class VehicleIn(BaseModel):
    registration_number: str
    name_model: str = ""
    vehicle_type: str = ""
    fuel_type: str = "Petrol"
    status: str = "Available"
    current_km_reading: float = 0
    insurance_expiry: Optional[datetime] = None
    puc_expiry: Optional[datetime] = None
    service_due: Optional[datetime] = None
    notes: str = ""


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    registration_number: str
    name_model: str
    vehicle_type: str
    fuel_type: str
    status: str
    current_km_reading: float
    insurance_expiry: Optional[datetime] = None
    puc_expiry: Optional[datetime] = None
    service_due: Optional[datetime] = None
    notes: str
    created_at: datetime
    # Computed
    total_trips: int = 0
    total_deliveries: int = 0
    total_km: float = 0
    total_fuel_litres: float = 0
    total_fuel_cost: float = 0
    avg_km_per_litre: Optional[float] = None


# ---------- Delivery Items ----------

class DeliveryItemIn(BaseModel):
    plant_id: Optional[int] = None
    description: str = ""
    unit: str = "pcs"
    ordered_quantity: int = 1
    notes: str = ""


class DeliveryItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    plant_id: Optional[int] = None
    description: str
    unit: str
    ordered_quantity: int
    delivered_quantity: Optional[int] = None
    notes: str


# ---------- Delivery ----------

class DeliveryIn(BaseModel):
    delivery_date: datetime
    expected_time: str = ""
    contact_id: int
    customer_mobile: str = ""
    delivery_address: str = ""
    sales_order_id: Optional[int] = None
    invoice_id: Optional[int] = None
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    notes: str = ""
    items: List[DeliveryItemIn] = []


class DeliveryAssignIn(BaseModel):
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None


class DeliveryStatusIn(BaseModel):
    status: str


class DeliveryCompleteItemIn(BaseModel):
    item_id: int
    delivered_quantity: int


class DeliveryCompleteIn(BaseModel):
    items: List[DeliveryCompleteItemIn]
    remarks: str = ""
    proof_photo_url: str = ""
    proof_signature_note: str = ""


class ContactRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    source: str


class DriverRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str


class VehicleRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    registration_number: str
    name_model: str


class DeliveryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    delivery_number: str
    delivery_date: datetime
    expected_time: str
    contact_id: Optional[int] = None
    customer_mobile: str
    delivery_address: str
    sales_order_id: Optional[int] = None
    invoice_id: Optional[int] = None
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    trip_id: Optional[int] = None
    status: str
    source: str
    notes: str
    proof_signature_note: str
    proof_photo_url: str
    delivery_remarks: str
    created_by: str
    created_at: datetime
    contact: Optional[ContactRef] = None
    driver: Optional[DriverRef] = None
    vehicle: Optional[VehicleRef] = None
    items: List[DeliveryItemOut] = []
    total_quantity: int = 0


# ---------- Trip ----------

class TripStartIn(BaseModel):
    vehicle_id: int
    driver_id: int
    trip_date: datetime
    start_km: float
    start_time: Optional[datetime] = None


class TripEndIn(BaseModel):
    end_km: float
    end_time: Optional[datetime] = None


class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    trip_number: str
    trip_date: datetime
    vehicle_id: int
    driver_id: int
    start_km: float
    start_time: Optional[datetime] = None
    end_km: Optional[float] = None
    end_time: Optional[datetime] = None
    total_km: Optional[float] = None
    status: str
    created_by: str
    created_at: datetime
    vehicle: Optional[VehicleRef] = None
    driver: Optional[DriverRef] = None
    delivery_count: int = 0


# ---------- Fuel ----------

class FuelLogIn(BaseModel):
    date: datetime
    vehicle_id: int
    driver_id: Optional[int] = None
    fuel_type: str = "Petrol"
    litres: float
    rate_per_litre: float
    odometer_reading: Optional[float] = None
    petrol_pump: str = ""
    payment_method: str = "Cash"
    receipt_reference: str = ""
    notes: str = ""


class FuelLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: datetime
    vehicle_id: int
    driver_id: Optional[int] = None
    fuel_type: str
    litres: float
    rate_per_litre: float
    total_amount: float
    odometer_reading: Optional[float] = None
    petrol_pump: str
    payment_method: str
    receipt_reference: str
    notes: str
    created_by: str
    created_at: datetime


# ---------- Dashboard ----------

class DeliveryDashboardOut(BaseModel):
    date_label: str
    total_deliveries: int = 0
    vehicles_on_route: int = 0
    completed: int = 0
    pending: int = 0
    cancelled: int = 0
    total_quantity: int = 0
    total_km: float = 0
    fuel_used_litres: float = 0
