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
)
from sqlalchemy.orm import relationship

from app.database import Base


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
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    name = Column(String(150), nullable=False)
    slug = Column(String(170), unique=True, nullable=False, index=True)
    description = Column(Text, default="")
    price = Column(Float, nullable=False, default=0)
    discount_price = Column(Float, nullable=True)
    stock_quantity = Column(Integer, default=0)
    sku = Column(String(50), default="")
    image_url = Column(String(300), default="")
    care_level = Column(String(50), default="Easy")
    features = Column(Text, default="")  # newline separated bullet features
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, default="")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
