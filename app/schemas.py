from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    description: str
    image_url: str
    display_order: int


class CategoryIn(BaseModel):
    name: str
    description: str = ""
    image_url: str = ""
    display_order: int = 0


class PlantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category_id: int
    name: str
    slug: str
    description: str
    price: float
    discount_price: Optional[float] = None
    effective_price: float
    stock_quantity: int
    sku: str
    image_url: str
    care_level: str
    feature_list: List[str]
    is_featured: bool
    is_active: bool
    category: Optional[CategoryOut] = None


class PlantIn(BaseModel):
    name: str
    category_id: int
    description: str = ""
    price: float = 0
    discount_price: Optional[float] = None
    stock_quantity: int = 0
    sku: str = ""
    image_url: str = ""
    care_level: str = "Easy"
    features: str = ""
    is_featured: bool = False
    is_active: bool = True


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    description: str
    price: float
    price_unit: str
    feature_list: List[str]
    image_url: str
    display_order: int
    is_active: bool


class ServiceIn(BaseModel):
    name: str
    description: str = ""
    price: float = 0
    price_unit: str = "one-time"
    features: str = ""
    image_url: str = ""
    display_order: int = 0
    is_active: bool = True


class PricingPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    price: float
    billing_cycle: str
    feature_list: List[str]
    is_featured: bool
    display_order: int


class PricingPlanIn(BaseModel):
    name: str
    price: float = 0
    billing_cycle: str = "monthly"
    features: str = ""
    is_featured: bool = False
    display_order: int = 0


class FAQOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    question: str
    answer: str
    display_order: int
    is_active: bool


class FAQIn(BaseModel):
    question: str
    answer: str
    display_order: int = 0
    is_active: bool = True


class TestimonialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_name: str
    rating: int
    message: str
    image_url: str
    is_approved: bool
    created_at: datetime


class TestimonialIn(BaseModel):
    customer_name: str
    rating: int = 5
    message: str
    image_url: str = ""
    is_approved: bool = True


class GalleryImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    image_url: str
    caption: str
    category: str
    display_order: int


class GalleryImageIn(BaseModel):
    image_url: str
    caption: str = ""
    category: str = ""
    display_order: int = 0


class BlogPostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    slug: str
    content: str
    excerpt: str
    image_url: str
    is_published: bool
    published_at: datetime


class BlogPostIn(BaseModel):
    title: str
    content: str
    excerpt: str = ""
    image_url: str = ""
    is_published: bool = True


class InquiryPlantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    image_url: str


class InquiryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    mobile: str
    requirement: str
    status: str
    plant_id: Optional[int] = None
    plant: Optional[InquiryPlantOut] = None
    created_at: datetime


class InquiryIn(BaseModel):
    name: str
    mobile: str
    requirement: str = ""
    plant_id: Optional[int] = None


class InquiryStatusIn(BaseModel):
    status: str


class LoginIn(BaseModel):
    username: str
    password: str


class UnifiedLoginIn(BaseModel):
    identifier: str
    password: str


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str
    created_at: Optional[datetime] = None


class AdminUserCreateIn(BaseModel):
    username: str
    password: str
    role: str = "admin"


class AdminPasswordResetIn(BaseModel):
    password: str


class AdminRoleIn(BaseModel):
    role: str


class ActivityLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    admin_username: str
    action: str
    detail: str
    created_at: datetime


class SystemInfoOut(BaseModel):
    counts: dict[str, int]
    session_secret_is_default: bool


class SettingsIn(BaseModel):
    values: dict[str, str]


# ---------- Customers / Cart / Orders ----------


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    mobile: str
    created_at: Optional[datetime] = None


class CustomerRegisterIn(BaseModel):
    name: str
    email: str
    mobile: str = ""
    password: str


class CustomerLoginIn(BaseModel):
    email: str
    password: str


class ForgotPasswordIn(BaseModel):
    email: str


class ResetPasswordIn(BaseModel):
    token: str
    password: str


class CartPlantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    image_url: str
    effective_price: float
    stock_quantity: int


class CartItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    plant_id: int
    quantity: int
    plant: Optional[CartPlantOut] = None


class CartAddIn(BaseModel):
    plant_id: int
    quantity: int = 1


class CartUpdateIn(BaseModel):
    quantity: int


class WishlistItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    plant_id: int
    created_at: datetime
    plant: Optional[CartPlantOut] = None


class WishlistAddIn(BaseModel):
    plant_id: int


class WishlistStatusOut(BaseModel):
    in_wishlist: bool


class CheckoutIn(BaseModel):
    delivery_name: str
    delivery_mobile: str
    delivery_line1: str
    delivery_line2: str = ""
    delivery_city: str
    delivery_state: str
    delivery_pincode: str
    payment_method: str = "COD"
    buy_now_plant_id: Optional[int] = None
    buy_now_quantity: int = 1


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    plant_id: Optional[int] = None
    plant_name: str
    plant_image_url: str
    plant_slug: Optional[str] = None
    unit_price: float
    quantity: int
    line_total: float


class OrderStatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    old_status: Optional[str] = None
    new_status: str
    updated_by: str
    remarks: str
    created_at: datetime


class OrderSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    payment_status: str
    total_amount: float
    created_at: datetime
    customer: Optional[CustomerOut] = None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    payment_status: str
    payment_method: str
    subtotal: float
    shipping_fee: float
    total_amount: float
    delivery_name: str
    delivery_mobile: str
    delivery_line1: str
    delivery_line2: str
    delivery_city: str
    delivery_state: str
    delivery_pincode: str
    tracking_number: str
    delivery_partner: str
    expected_delivery_date: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    notes: str
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerOut] = None
    items: List[OrderItemOut] = []
    history: List[OrderStatusHistoryOut] = []


class OrderCancelIn(BaseModel):
    remarks: str = ""


class CustomerAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    mobile: str
    created_at: Optional[datetime] = None
    order_count: int = 0


class CustomerOrderOut(OrderSummaryOut):
    items: List[OrderItemOut] = []


class CustomerAdminDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    mobile: str
    created_at: Optional[datetime] = None
    total_orders: int = 0
    total_spent: float = 0
    orders: List[CustomerOrderOut] = []


class OrderAdminUpdateIn(BaseModel):
    status: Optional[str] = None
    tracking_number: Optional[str] = None
    delivery_partner: Optional[str] = None
    expected_delivery_date: Optional[datetime] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None
    remarks: str = ""
