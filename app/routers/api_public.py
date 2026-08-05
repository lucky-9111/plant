from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    FAQ,
    BlogPost,
    Category,
    GalleryImage,
    Inquiry,
    Plant,
    PricingPlan,
    Service,
    Testimonial,
)
from app.schemas import (
    BlogPostOut,
    CategoryOut,
    FAQOut,
    GalleryImageOut,
    InquiryIn,
    InquiryOut,
    PlantOut,
    PricingPlanOut,
    ServiceOut,
    TestimonialOut,
)
from app.settings_helper import get_settings

router = APIRouter(prefix="/api")


@router.get("/settings")
def read_settings(db: Session = Depends(get_db)):
    return get_settings(db)


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.display_order).all()


@router.get("/plants", response_model=list[PlantOut])
def list_plants(
    category: Optional[str] = None,
    featured: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Plant).options(joinedload(Plant.category)).filter(Plant.is_active.is_(True))
    if category:
        query = query.join(Category).filter(Category.slug == category)
    if featured:
        query = query.filter(Plant.is_featured.is_(True))
    return query.all()


@router.get("/plants/{slug}", response_model=PlantOut)
def get_plant(slug: str, db: Session = Depends(get_db)):
    plant = (
        db.query(Plant)
        .options(joinedload(Plant.category))
        .filter(Plant.slug == slug)
        .first()
    )
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant


@router.get("/plants/{slug}/related", response_model=list[PlantOut])
def get_related_plants(slug: str, db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.slug == slug).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return (
        db.query(Plant)
        .filter(Plant.category_id == plant.category_id, Plant.id != plant.id)
        .limit(4)
        .all()
    )


@router.get("/services", response_model=list[ServiceOut])
def list_services(db: Session = Depends(get_db)):
    return (
        db.query(Service).filter(Service.is_active.is_(True)).order_by(Service.display_order).all()
    )


@router.get("/pricing-plans", response_model=list[PricingPlanOut])
def list_pricing_plans(db: Session = Depends(get_db)):
    return db.query(PricingPlan).order_by(PricingPlan.display_order).all()


@router.get("/faqs", response_model=list[FAQOut])
def list_faqs(db: Session = Depends(get_db)):
    return db.query(FAQ).filter(FAQ.is_active.is_(True)).order_by(FAQ.display_order).all()


@router.get("/testimonials", response_model=list[TestimonialOut])
def list_testimonials(db: Session = Depends(get_db)):
    return (
        db.query(Testimonial)
        .filter(Testimonial.is_approved.is_(True))
        .order_by(Testimonial.created_at.desc())
        .all()
    )


@router.get("/gallery", response_model=list[GalleryImageOut])
def list_gallery(db: Session = Depends(get_db)):
    return db.query(GalleryImage).order_by(GalleryImage.display_order).all()


@router.get("/blog", response_model=list[BlogPostOut])
def list_blog_posts(db: Session = Depends(get_db)):
    return (
        db.query(BlogPost)
        .filter(BlogPost.is_published.is_(True))
        .order_by(BlogPost.published_at.desc())
        .all()
    )


@router.get("/blog/{slug}", response_model=BlogPostOut)
def get_blog_post(slug: str, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/inquiries", response_model=InquiryOut, status_code=201)
def create_inquiry(payload: InquiryIn, db: Session = Depends(get_db)):
    inquiry = Inquiry(
        name=payload.name.strip(),
        mobile=payload.mobile.strip(),
        requirement=payload.requirement.strip(),
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)
    return inquiry
