from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from slugify import slugify
from sqlalchemy.orm import Session, joinedload

from app.auth import verify_password
from app.database import get_db
from app.deps import get_current_admin
from app.models import (
    FAQ,
    AdminUser,
    BlogPost,
    Category,
    GalleryImage,
    Inquiry,
    Plant,
    PricingPlan,
    Service,
    SiteSetting,
    Testimonial,
)
from app.schemas import (
    BlogPostIn,
    BlogPostOut,
    CategoryIn,
    CategoryOut,
    FAQIn,
    FAQOut,
    GalleryImageIn,
    GalleryImageOut,
    InquiryOut,
    InquiryStatusIn,
    LoginIn,
    PlantIn,
    PlantOut,
    PricingPlanIn,
    PricingPlanOut,
    ServiceIn,
    ServiceOut,
    SettingsIn,
    TestimonialIn,
    TestimonialOut,
)
from app.settings_helper import get_settings

router = APIRouter(prefix="/api/admin")


def unique_slug(db: Session, model, base_text: str, exclude_id: Optional[int] = None) -> str:
    base = slugify(base_text)
    slug = base
    counter = 2
    while True:
        query = db.query(model).filter(model.slug == slug)
        if exclude_id is not None:
            query = query.filter(model.id != exclude_id)
        if not query.first():
            return slug
        slug = f"{base}-{counter}"
        counter += 1


def get_or_404(db: Session, model, item_id: int):
    item = db.query(model).filter(model.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return item


# ---------- Auth ----------

@router.post("/login")
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.username == payload.username.strip()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    request.session["admin_username"] = user.username
    return {"username": user.username}


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@router.get("/me")
def me(admin: str = Depends(get_current_admin)):
    return {"username": admin}


# ---------- Dashboard ----------

@router.get("/dashboard")
def dashboard(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    counts = {
        "categories": db.query(Category).count(),
        "plants": db.query(Plant).count(),
        "services": db.query(Service).count(),
        "inquiries": db.query(Inquiry).count(),
        "testimonials": db.query(Testimonial).count(),
        "blog_posts": db.query(BlogPost).count(),
    }
    recent_inquiries = (
        db.query(Inquiry)
        .options(joinedload(Inquiry.plant))
        .order_by(Inquiry.created_at.desc())
        .limit(5)
        .all()
    )
    return {
        "counts": counts,
        "recent_inquiries": [InquiryOut.model_validate(i) for i in recent_inquiries],
    }


# ---------- Categories ----------

@router.get("/categories", response_model=list[CategoryOut])
def list_categories(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.display_order).all()


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(
    payload: CategoryIn, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = Category(
        name=payload.name.strip(),
        slug=unique_slug(db, Category, payload.name),
        description=payload.description.strip(),
        image_url=payload.image_url.strip(),
        display_order=payload.display_order,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/categories/{item_id}", response_model=CategoryOut)
def update_category(
    item_id: int,
    payload: CategoryIn,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    item = get_or_404(db, Category, item_id)
    if item.name != payload.name.strip():
        item.slug = unique_slug(db, Category, payload.name, exclude_id=item.id)
    item.name = payload.name.strip()
    item.description = payload.description.strip()
    item.image_url = payload.image_url.strip()
    item.display_order = payload.display_order
    db.commit()
    db.refresh(item)
    return item


@router.delete("/categories/{item_id}", status_code=204)
def delete_category(
    item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = get_or_404(db, Category, item_id)
    db.delete(item)
    db.commit()


# ---------- Plants ----------

@router.get("/plants", response_model=list[PlantOut])
def list_plants(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Plant).order_by(Plant.category_id).all()


@router.post("/plants", response_model=PlantOut, status_code=201)
def create_plant(
    payload: PlantIn, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = Plant(
        name=payload.name.strip(),
        slug=unique_slug(db, Plant, payload.name),
        category_id=payload.category_id,
        description=payload.description.strip(),
        price=payload.price,
        discount_price=payload.discount_price,
        stock_quantity=payload.stock_quantity,
        sku=payload.sku.strip(),
        image_url=payload.image_url.strip(),
        care_level=payload.care_level.strip(),
        features=payload.features.strip(),
        is_featured=payload.is_featured,
        is_active=payload.is_active,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/plants/{item_id}", response_model=PlantOut)
def update_plant(
    item_id: int,
    payload: PlantIn,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    item = get_or_404(db, Plant, item_id)
    if item.name != payload.name.strip():
        item.slug = unique_slug(db, Plant, payload.name, exclude_id=item.id)
    item.name = payload.name.strip()
    item.category_id = payload.category_id
    item.description = payload.description.strip()
    item.price = payload.price
    item.discount_price = payload.discount_price
    item.stock_quantity = payload.stock_quantity
    item.sku = payload.sku.strip()
    item.image_url = payload.image_url.strip()
    item.care_level = payload.care_level.strip()
    item.features = payload.features.strip()
    item.is_featured = payload.is_featured
    item.is_active = payload.is_active
    db.commit()
    db.refresh(item)
    return item


@router.delete("/plants/{item_id}", status_code=204)
def delete_plant(
    item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = get_or_404(db, Plant, item_id)
    db.delete(item)
    db.commit()


# ---------- Services ----------

@router.get("/services", response_model=list[ServiceOut])
def list_services(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Service).order_by(Service.display_order).all()


@router.post("/services", response_model=ServiceOut, status_code=201)
def create_service(
    payload: ServiceIn, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = Service(
        name=payload.name.strip(),
        slug=unique_slug(db, Service, payload.name),
        description=payload.description.strip(),
        price=payload.price,
        price_unit=payload.price_unit.strip(),
        features=payload.features.strip(),
        image_url=payload.image_url.strip(),
        display_order=payload.display_order,
        is_active=payload.is_active,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/services/{item_id}", response_model=ServiceOut)
def update_service(
    item_id: int,
    payload: ServiceIn,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    item = get_or_404(db, Service, item_id)
    if item.name != payload.name.strip():
        item.slug = unique_slug(db, Service, payload.name, exclude_id=item.id)
    item.name = payload.name.strip()
    item.description = payload.description.strip()
    item.price = payload.price
    item.price_unit = payload.price_unit.strip()
    item.features = payload.features.strip()
    item.image_url = payload.image_url.strip()
    item.display_order = payload.display_order
    item.is_active = payload.is_active
    db.commit()
    db.refresh(item)
    return item


@router.delete("/services/{item_id}", status_code=204)
def delete_service(
    item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = get_or_404(db, Service, item_id)
    db.delete(item)
    db.commit()


# ---------- Pricing Plans ----------

@router.get("/pricing-plans", response_model=list[PricingPlanOut])
def list_pricing_plans(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(PricingPlan).order_by(PricingPlan.display_order).all()


@router.post("/pricing-plans", response_model=PricingPlanOut, status_code=201)
def create_pricing_plan(
    payload: PricingPlanIn, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = PricingPlan(
        name=payload.name.strip(),
        price=payload.price,
        billing_cycle=payload.billing_cycle.strip(),
        features=payload.features.strip(),
        is_featured=payload.is_featured,
        display_order=payload.display_order,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/pricing-plans/{item_id}", response_model=PricingPlanOut)
def update_pricing_plan(
    item_id: int,
    payload: PricingPlanIn,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    item = get_or_404(db, PricingPlan, item_id)
    item.name = payload.name.strip()
    item.price = payload.price
    item.billing_cycle = payload.billing_cycle.strip()
    item.features = payload.features.strip()
    item.is_featured = payload.is_featured
    item.display_order = payload.display_order
    db.commit()
    db.refresh(item)
    return item


@router.delete("/pricing-plans/{item_id}", status_code=204)
def delete_pricing_plan(
    item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = get_or_404(db, PricingPlan, item_id)
    db.delete(item)
    db.commit()


# ---------- FAQs ----------

@router.get("/faqs", response_model=list[FAQOut])
def list_faqs(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(FAQ).order_by(FAQ.display_order).all()


@router.post("/faqs", response_model=FAQOut, status_code=201)
def create_faq(
    payload: FAQIn, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = FAQ(
        question=payload.question.strip(),
        answer=payload.answer.strip(),
        display_order=payload.display_order,
        is_active=payload.is_active,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/faqs/{item_id}", response_model=FAQOut)
def update_faq(
    item_id: int,
    payload: FAQIn,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    item = get_or_404(db, FAQ, item_id)
    item.question = payload.question.strip()
    item.answer = payload.answer.strip()
    item.display_order = payload.display_order
    item.is_active = payload.is_active
    db.commit()
    db.refresh(item)
    return item


@router.delete("/faqs/{item_id}", status_code=204)
def delete_faq(item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    item = get_or_404(db, FAQ, item_id)
    db.delete(item)
    db.commit()


# ---------- Testimonials ----------

@router.get("/testimonials", response_model=list[TestimonialOut])
def list_testimonials(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Testimonial).order_by(Testimonial.created_at.desc()).all()


@router.post("/testimonials", response_model=TestimonialOut, status_code=201)
def create_testimonial(
    payload: TestimonialIn, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = Testimonial(
        customer_name=payload.customer_name.strip(),
        rating=payload.rating,
        message=payload.message.strip(),
        image_url=payload.image_url.strip(),
        is_approved=payload.is_approved,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/testimonials/{item_id}", response_model=TestimonialOut)
def update_testimonial(
    item_id: int,
    payload: TestimonialIn,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    item = get_or_404(db, Testimonial, item_id)
    item.customer_name = payload.customer_name.strip()
    item.rating = payload.rating
    item.message = payload.message.strip()
    item.image_url = payload.image_url.strip()
    item.is_approved = payload.is_approved
    db.commit()
    db.refresh(item)
    return item


@router.delete("/testimonials/{item_id}", status_code=204)
def delete_testimonial(
    item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = get_or_404(db, Testimonial, item_id)
    db.delete(item)
    db.commit()


# ---------- Gallery ----------

@router.get("/gallery", response_model=list[GalleryImageOut])
def list_gallery(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(GalleryImage).order_by(GalleryImage.display_order).all()


@router.post("/gallery", response_model=GalleryImageOut, status_code=201)
def create_gallery_image(
    payload: GalleryImageIn, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = GalleryImage(
        image_url=payload.image_url.strip(),
        caption=payload.caption.strip(),
        category=payload.category.strip(),
        display_order=payload.display_order,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/gallery/{item_id}", response_model=GalleryImageOut)
def update_gallery_image(
    item_id: int,
    payload: GalleryImageIn,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    item = get_or_404(db, GalleryImage, item_id)
    item.image_url = payload.image_url.strip()
    item.caption = payload.caption.strip()
    item.category = payload.category.strip()
    item.display_order = payload.display_order
    db.commit()
    db.refresh(item)
    return item


@router.delete("/gallery/{item_id}", status_code=204)
def delete_gallery_image(
    item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = get_or_404(db, GalleryImage, item_id)
    db.delete(item)
    db.commit()


# ---------- Blog ----------

@router.get("/blog", response_model=list[BlogPostOut])
def list_blog_posts(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(BlogPost).order_by(BlogPost.published_at.desc()).all()


@router.post("/blog", response_model=BlogPostOut, status_code=201)
def create_blog_post(
    payload: BlogPostIn, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = BlogPost(
        title=payload.title.strip(),
        slug=unique_slug(db, BlogPost, payload.title),
        excerpt=payload.excerpt.strip(),
        content=payload.content.strip(),
        image_url=payload.image_url.strip(),
        is_published=payload.is_published,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/blog/{item_id}", response_model=BlogPostOut)
def update_blog_post(
    item_id: int,
    payload: BlogPostIn,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    item = get_or_404(db, BlogPost, item_id)
    if item.title != payload.title.strip():
        item.slug = unique_slug(db, BlogPost, payload.title, exclude_id=item.id)
    item.title = payload.title.strip()
    item.excerpt = payload.excerpt.strip()
    item.content = payload.content.strip()
    item.image_url = payload.image_url.strip()
    item.is_published = payload.is_published
    db.commit()
    db.refresh(item)
    return item


@router.delete("/blog/{item_id}", status_code=204)
def delete_blog_post(
    item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = get_or_404(db, BlogPost, item_id)
    db.delete(item)
    db.commit()


# ---------- Inquiries ----------

@router.get("/inquiries", response_model=list[InquiryOut])
def list_inquiries(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return (
        db.query(Inquiry)
        .options(joinedload(Inquiry.plant))
        .order_by(Inquiry.created_at.desc())
        .all()
    )


@router.put("/inquiries/{item_id}/status", response_model=InquiryOut)
def update_inquiry_status(
    item_id: int,
    payload: InquiryStatusIn,
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    item = get_or_404(db, Inquiry, item_id)
    item.status = payload.status
    db.commit()
    db.refresh(item)
    return item


@router.delete("/inquiries/{item_id}", status_code=204)
def delete_inquiry(
    item_id: int, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    item = get_or_404(db, Inquiry, item_id)
    db.delete(item)
    db.commit()


# ---------- Settings ----------

@router.get("/settings")
def read_settings(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return get_settings(db)


@router.put("/settings")
def update_settings(
    payload: SettingsIn, admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
):
    for key, value in payload.values.items():
        setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
        if setting:
            setting.value = value
        else:
            db.add(SiteSetting(key=key, value=value))
    db.commit()
    return get_settings(db)
