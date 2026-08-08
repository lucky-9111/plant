from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base

# Order lifecycle
MAIN_STATUSES = [
    "Pending",
    "Confirmed",
    "Processing",
    "Packed",
    "Shipped",
    "Out For Delivery",
    "Delivered",
]
EXTRA_STATUSES = ["Cancelled", "Refund Initiated", "Refund Completed", "Returned"]
ALL_ORDER_STATUSES = MAIN_STATUSES + EXTRA_STATUSES
CANCELLABLE_STATUSES = {"Pending", "Confirmed"}
PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refund Initiated", "Refund Completed"]


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    slug = Column(String(140), unique=True, nullable=False, index=True)
    description = Column(Text, default="")
    image_url = Column(String(300), default="")
    display_order = Column(Integer, default=0)

    plants = relationship("Plant", back_populates="category", cascade="all, delete-orphan")


class Plant(Base):
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    slug = Column(String(170), unique=True, nullable=False, index=True)
    description = Column(Text, default="")
    price = Column(Float, nullable=False, default=0, index=True)
    discount_price = Column(Float, nullable=True)
    stock_quantity = Column(Integer, default=0, index=True)
    sku = Column(String(50), default="")
    image_url = Column(String(300), default="")
    care_level = Column(String(50), default="Easy")
    features = Column(Text, default="")  # newline separated bullet features
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    category = relationship("Category", back_populates="plants")

    @property
    def feature_list(self):
        return [f.strip() for f in (self.features or "").split("\n") if f.strip()]

    @property
    def effective_price(self):
        return self.discount_price if self.discount_price else self.price


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    slug = Column(String(170), unique=True, nullable=False, index=True)
    description = Column(Text, default="")
    price = Column(Float, nullable=False, default=0)
    price_unit = Column(String(50), default="one-time")  # e.g. one-time, /visit, /month
    features = Column(Text, default="")
    image_url = Column(String(300), default="")
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    @property
    def feature_list(self):
        return [f.strip() for f in (self.features or "").split("\n") if f.strip()]


class PricingPlan(Base):
    __tablename__ = "pricing_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    price = Column(Float, nullable=False, default=0)
    billing_cycle = Column(String(30), default="monthly")  # monthly, yearly, one-time
    features = Column(Text, default="")
    is_featured = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)

    @property
    def feature_list(self):
        return [f.strip() for f in (self.features or "").split("\n") if f.strip()]


class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String(300), nullable=False)
    answer = Column(Text, nullable=False)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)


class Testimonial(Base):
    __tablename__ = "testimonials"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(120), nullable=False)
    rating = Column(Integer, default=5)
    message = Column(Text, nullable=False)
    image_url = Column(String(300), default="")
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class GalleryImage(Base):
    __tablename__ = "gallery_images"

    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(String(300), nullable=False)
    caption = Column(String(200), default="")
    category = Column(String(100), default="")
    display_order = Column(Integer, default=0)


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(220), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)
    excerpt = Column(String(400), default="")
    image_url = Column(String(300), default="")
    is_published = Column(Boolean, default=True)
    published_at = Column(DateTime, default=datetime.utcnow)


class Inquiry(Base):
    __tablename__ = "inquiries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    mobile = Column(String(30), nullable=False)
    requirement = Column(Text, default="")
    status = Column(String(30), default="new")  # new, contacted, closed
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    plant = relationship("Plant")


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, default="")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False, default="admin")
    created_at = Column(DateTime, default=datetime.utcnow)


class AdminActivityLog(Base):
    __tablename__ = "admin_activity_log"

    id = Column(Integer, primary_key=True, index=True)
    admin_username = Column(String(80), nullable=False)
    action = Column(String(50), nullable=False)
    detail = Column(String(200), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(180), unique=True, nullable=False, index=True)
    mobile = Column(String(30), default="")
    hashed_password = Column(String(200), nullable=False)
    reset_token = Column(String(100), nullable=True, index=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("customer_id", "plant_id", name="uq_cart_customer_plant"),)

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False, index=True)
    quantity = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    plant = relationship("Plant")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    status = Column(String(30), default="Pending", index=True)
    payment_status = Column(String(30), default="Pending")
    payment_method = Column(String(30), default="COD")

    subtotal = Column(Float, default=0)
    shipping_fee = Column(Float, default=0)
    total_amount = Column(Float, default=0)

    delivery_name = Column(String(120), default="")
    delivery_mobile = Column(String(30), default="")
    delivery_line1 = Column(String(200), default="")
    delivery_line2 = Column(String(200), default="")
    delivery_city = Column(String(100), default="")
    delivery_state = Column(String(100), default="")
    delivery_pincode = Column(String(20), default="")

    tracking_number = Column(String(100), default="")
    delivery_partner = Column(String(100), default="")
    expected_delivery_date = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    notes = Column(Text, default="")

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    history = relationship(
        "OrderStatusHistory",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderStatusHistory.created_at",
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=True)
    plant_name = Column(String(150), default="")
    plant_image_url = Column(String(300), default="")
    unit_price = Column(Float, default=0)
    quantity = Column(Integer, default=1)
    line_total = Column(Float, default=0)

    order = relationship("Order", back_populates="items")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    updated_by = Column(String(80), default="")
    remarks = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    order = relationship("Order", back_populates="history")
