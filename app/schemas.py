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


class SettingsIn(BaseModel):
    values: dict[str, str]
