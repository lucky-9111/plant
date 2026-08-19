"""Shared catalog placeholder data, used by seed.py and by the startup
auto-seed in app/main.py (which refills catalog tables when they're empty -
Render's free tier has no persistent disk, so SQLite resets on every deploy)."""
from slugify import slugify

from app.auth import hash_password
from app.models import (
    FAQ,
    AdminUser,
    BlogPost,
    Category,
    GalleryImage,
    Plant,
    PricingPlan,
    Service,
    Testimonial,
)

CATEGORIES_DATA = [
    {
        "name": "Indoor Plants",
        "description": "Air-purifying and low-maintenance plants perfect for homes and offices.",
        "image_url": "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800",
        "plants": [
            {"name": "Money Plant (Golden Pothos)", "price": 249, "discount_price": 199, "stock": 40, "care": "Easy", "desc": "A trailing vine known to bring good luck and purify indoor air. Thrives in low to bright indirect light.", "features": "Air-purifying\nLow maintenance\nThrives in low light\nFast growing", "featured": True, "img": "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800"},
            {"name": "Snake Plant (Sansevieria)", "price": 349, "discount_price": None, "stock": 25, "care": "Easy", "desc": "One of the hardiest indoor plants, releases oxygen at night, and tolerates neglect well.", "features": "Releases oxygen at night\nDrought tolerant\nRemoves toxins\nPet-safe placement recommended", "featured": True, "img": "https://images.unsplash.com/photo-1572688484438-313a6e50c333?w=800"},
            {"name": "Peace Lily", "price": 399, "discount_price": 349, "stock": 18, "care": "Moderate", "desc": "Elegant white blooms and glossy leaves that thrive in shade and humidity.", "features": "Beautiful white flowers\nRemoves indoor toxins\nPrefers indirect light\nRegular misting recommended", "featured": False, "img": "https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?w=800"},
            {"name": "ZZ Plant", "price": 449, "discount_price": None, "stock": 22, "care": "Easy", "desc": "Glossy dark-green leaves on a plant that survives weeks without water.", "features": "Extremely drought tolerant\nLow light tolerant\nGlossy foliage\nSlow growing", "featured": False, "img": "https://images.unsplash.com/photo-1572688484438-313a6e50c333?w=800"},
        ],
    },
    {
        "name": "Outdoor Plants",
        "description": "Hardy garden plants and flowering shrubs for balconies, lawns, and landscaping.",
        "image_url": "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800",
        "plants": [
            {"name": "Hibiscus Plant", "price": 299, "discount_price": None, "stock": 30, "care": "Easy", "desc": "Vibrant, large blooms all season long. A garden favourite that attracts butterflies.", "features": "Large colourful blooms\nAttracts pollinators\nFull sun loving\nRegular pruning encourages flowers", "featured": True, "img": "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800"},
            {"name": "Bougainvillea", "price": 279, "discount_price": 229, "stock": 35, "care": "Easy", "desc": "A vigorous climber with vibrant papery bracts, ideal for gates, fences, and pergolas.", "features": "Vigorous climber\nDrought tolerant once established\nVibrant colour options\nFull sun loving", "featured": False, "img": "https://images.unsplash.com/photo-1589994160839-163cd867cfe8?w=800"},
            {"name": "Rose Plant (Hybrid Tea)", "price": 329, "discount_price": None, "stock": 28, "care": "Moderate", "desc": "Classic fragrant roses, perfect for garden beds and cut flower arrangements.", "features": "Fragrant blooms\nMultiple colour varieties\nRequires regular feeding\nFull sun loving", "featured": True, "img": "https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=800"},
        ],
    },
    {
        "name": "Succulents & Cacti",
        "description": "Trendy, low-water plants that thrive on neglect and add modern style to any space.",
        "image_url": "https://images.unsplash.com/photo-1459156212016-c812468e2115?w=800",
        "plants": [
            {"name": "Echeveria Succulent Set (Pack of 3)", "price": 349, "discount_price": 299, "stock": 50, "care": "Easy", "desc": "A curated set of three rosette-shaped succulents in complementary colours.", "features": "Set of 3 varieties\nMinimal watering needed\nCompact desk-friendly size\nComes in nursery pots", "featured": True, "img": "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=800"},
            {"name": "Golden Barrel Cactus", "price": 449, "discount_price": None, "stock": 15, "care": "Easy", "desc": "A striking round cactus with golden spines, a statement piece for sunny corners.", "features": "Extremely low maintenance\nStatement piece\nSlow growing\nFull sun loving", "featured": False, "img": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800"},
        ],
    },
    {
        "name": "Seeds & Bulbs",
        "description": "High-germination vegetable, flower, and herb seeds for your home garden.",
        "image_url": "https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800",
        "plants": [
            {"name": "Marigold Seeds (Pack of 50)", "price": 79, "discount_price": None, "stock": 100, "care": "Easy", "desc": "Fast-germinating marigold seeds, ideal for borders and pest-repelling companion planting.", "features": "50 seeds per pack\nHigh germination rate\nBlooms in 45-50 days\nNatural pest repellent", "featured": False, "img": "https://images.unsplash.com/photo-1597305877032-0668b3c6413a?w=800"},
            {"name": "Tomato Seeds - Hybrid (Pack of 30)", "price": 99, "discount_price": 79, "stock": 80, "care": "Moderate", "desc": "High-yield hybrid tomato seeds suited for home vegetable gardens and containers.", "features": "30 seeds per pack\nHigh yield hybrid variety\nSuitable for containers\nHarvest in 60-70 days", "featured": True, "img": "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800"},
        ],
    },
    {
        "name": "Pots & Planters",
        "description": "Ceramic, terracotta, and self-watering planters in every size and style.",
        "image_url": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800",
        "plants": [
            {"name": "Terracotta Pot (8 inch)", "price": 149, "discount_price": None, "stock": 60, "care": "-", "desc": "Classic breathable terracotta pot with drainage hole, suits most indoor and outdoor plants.", "features": "8 inch diameter\nBuilt-in drainage hole\nBreathable natural clay\nHandmade finish", "featured": False, "img": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800"},
            {"name": "Self-Watering Ceramic Planter", "price": 599, "discount_price": 499, "stock": 20, "care": "-", "desc": "Modern glazed ceramic planter with a built-in water reservoir for low-maintenance care.", "features": "Built-in water reservoir\nGlazed ceramic finish\nReduces watering frequency\nAvailable in 4 colours", "featured": True, "img": "https://images.unsplash.com/photo-1462530260150-162092dbf011?w=800"},
        ],
    },
    {
        "name": "Gardening Tools & Supplies",
        "description": "Essential tools, soil mixes, and fertilizers to keep your garden thriving.",
        "image_url": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800",
        "plants": [
            {"name": "Potting Soil Mix (5 kg)", "price": 199, "discount_price": None, "stock": 70, "care": "-", "desc": "Nutrient-rich, well-draining potting mix suitable for most indoor and outdoor plants.", "features": "5 kg pack\nEnriched with organic compost\nSuitable for most plant types\nWell-draining formula", "featured": False, "img": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800"},
            {"name": "Gardening Tool Kit (5-Piece)", "price": 449, "discount_price": 399, "stock": 25, "care": "-", "desc": "A durable 5-piece hand tool set including trowel, pruner, cultivator, and gloves.", "features": "5 essential tools included\nRust-resistant steel\nErgonomic handles\nComes with carry pouch", "featured": True, "img": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800"},
        ],
    },
]

SERVICES_DATA = [
    {
        "name": "Home Garden Setup",
        "desc": "End-to-end design and setup of a home garden - from soil prep to plant selection and layout.",
        "price": 4999,
        "unit": "starting price",
        "features": "Free on-site consultation\nCustom plant selection\nSoil preparation & amendment\n30-day setup warranty",
        "img": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800",
    },
    {
        "name": "Monthly Garden Maintenance",
        "desc": "Recurring maintenance visits covering pruning, pest control, fertilizing, and watering guidance.",
        "price": 999,
        "unit": "/month",
        "features": "2 visits per month\nPruning & pest control\nFertilizer application\nSeasonal plant health report",
        "img": "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800",
    },
    {
        "name": "Landscape Design & Installation",
        "desc": "Full landscaping service for villas, offices, and commercial spaces, including hardscape elements.",
        "price": 19999,
        "unit": "starting price",
        "features": "Custom landscape design\nHardscape & softscape\nIrrigation system setup\nDedicated project manager",
        "img": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800",
    },
]

PLANS_DATA = [
    {"name": "Basic Care", "price": 499, "cycle": "monthly", "features": "1 maintenance visit/month\nBasic pruning\nWatering guidance\nEmail support", "featured": False},
    {"name": "Growth Plan", "price": 999, "cycle": "monthly", "features": "2 maintenance visits/month\nPruning & pest control\nFertilizer included\nPriority WhatsApp support", "featured": True},
    {"name": "Premium Care", "price": 9999, "cycle": "yearly", "features": "Unlimited visits\nFull pest & disease management\nSeasonal replanting included\nDedicated garden expert", "featured": False},
]

FAQS_DATA = [
    ("What are the prices of your plants?", "Prices vary by plant and pot size, typically ranging from Rs. 79 for seed packs to Rs. 600+ for larger potted plants. Visit our Plants catalog or Pricing page for full details."),
    ("How many days will delivery take?", "Local deliveries take 3-5 business days, and outstation orders take 5-9 business days. You'll receive a tracking update once your order ships."),
    ("What payment methods are accepted?", "We accept UPI, credit/debit cards, net banking, and cash on delivery for eligible pin codes."),
    ("How can customers reach support?", "You can reach us via phone, email, or WhatsApp - all listed on our Contact page. Our support hours match our working hours."),
    ("What is the refund policy?", "If a plant arrives damaged or dies within 7 days due to a growing defect, we offer a free replacement or full refund. Just contact support with a photo."),
    ("What are your working hours?", "We're open Monday to Saturday, 9:00 AM to 7:00 PM, and Sunday 10:00 AM to 4:00 PM."),
]

TESTIMONIALS_DATA = [
    ("Priya Sharma", 5, "Aaiji Nursery transformed our balcony into a green paradise! The plants arrived healthy and the team's advice on care was spot on."),
    ("Rohit Deshmukh", 5, "Booked their monthly maintenance plan for our office garden - professional, punctual, and our plants have never looked better."),
    ("Anita Kulkarni", 4, "Great variety of succulents and quick delivery. Would love to see more pot color options, but overall very happy!"),
]

GALLERY_DATA = [
    ("https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800", "Balcony garden installation", "Residential"),
    ("https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800", "Office landscape project", "Commercial"),
    ("https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800", "Home garden setup in progress", "Residential"),
    ("https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800", "Seasonal plant health check", "Maintenance"),
    ("https://images.unsplash.com/photo-1597305877032-0668b3c6413a?w=800", "Flower bed makeover", "Residential"),
    ("https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=800", "Succulent arrangement display", "Retail"),
]

BLOG_DATA = [
    {
        "title": "5 Low-Maintenance Indoor Plants for Beginners",
        "excerpt": "New to plant parenting? Start with these five nearly indestructible indoor plants.",
        "content": "Starting your indoor jungle doesn't have to be intimidating. Snake plants, pothos, and ZZ plants top our list for beginners because they tolerate irregular watering and low light. In this guide we cover watering schedules, light needs, and common mistakes to avoid so your first plants thrive, not just survive.",
        "img": "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800",
    },
    {
        "title": "Monsoon Garden Care: What to Do Before the Rains",
        "excerpt": "Prep your garden now to avoid waterlogging, fungal issues, and pest outbreaks this monsoon.",
        "content": "Monsoon season brings relief from summer heat but also new challenges - waterlogged soil, fungal infections, and pest surges. This post walks through drainage checks, preventive neem oil spraying, and which plants to move under cover before the first heavy rains hit.",
        "img": "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800",
    },
    {
        "title": "Aaiji Nursery Launches Monthly Maintenance Plans",
        "excerpt": "We're excited to announce flexible monthly plans for home and office garden upkeep.",
        "content": "Based on customer feedback, we've launched three tiers of monthly maintenance plans - Basic Care, Growth Plan, and Premium Care - so you can keep your garden thriving without doing the work yourself. Check out our Pricing page for full details and sign up today.",
        "img": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800",
    },
]


def populate_catalog(db):
    """Insert the placeholder catalog (categories/plants/services/plans/faqs/
    testimonials/gallery/blog) into an already-empty set of tables."""
    for order, cat in enumerate(CATEGORIES_DATA):
        category = Category(
            name=cat["name"],
            slug=slugify(cat["name"]),
            description=cat["description"],
            image_url=cat["image_url"],
            display_order=order,
        )
        db.add(category)
        db.flush()

        for plant in cat["plants"]:
            db.add(
                Plant(
                    category_id=category.id,
                    name=plant["name"],
                    slug=slugify(plant["name"]),
                    description=plant["desc"],
                    price=plant["price"],
                    discount_price=plant["discount_price"],
                    stock_quantity=plant["stock"],
                    sku=f"AAIJI-{slugify(plant['name']).upper()[:10]}",
                    image_url=plant["img"],
                    care_level=plant["care"],
                    features=plant["features"],
                    is_featured=plant["featured"],
                    is_active=True,
                )
            )

    for order, svc in enumerate(SERVICES_DATA):
        db.add(
            Service(
                name=svc["name"],
                slug=slugify(svc["name"]),
                description=svc["desc"],
                price=svc["price"],
                price_unit=svc["unit"],
                features=svc["features"],
                image_url=svc["img"],
                display_order=order,
                is_active=True,
            )
        )

    for order, plan in enumerate(PLANS_DATA):
        db.add(
            PricingPlan(
                name=plan["name"],
                price=plan["price"],
                billing_cycle=plan["cycle"],
                features=plan["features"],
                is_featured=plan["featured"],
                display_order=order,
            )
        )

    for order, (q, a) in enumerate(FAQS_DATA):
        db.add(FAQ(question=q, answer=a, display_order=order, is_active=True))

    for name, rating, msg in TESTIMONIALS_DATA:
        db.add(Testimonial(customer_name=name, rating=rating, message=msg, is_approved=True))

    for order, (url, caption, cat) in enumerate(GALLERY_DATA):
        db.add(GalleryImage(image_url=url, caption=caption, category=cat, display_order=order))

    for post in BLOG_DATA:
        db.add(
            BlogPost(
                title=post["title"],
                slug=slugify(post["title"]),
                excerpt=post["excerpt"],
                content=post["content"],
                image_url=post["img"],
                is_published=True,
            )
        )


def seed_if_empty(SessionLocal):
    """Auto-fill catalog tables (and the default admin user) on startup if
    they're empty. Render's free tier has no persistent disk, so a fresh
    SQLite file appears after every deploy/restart - this keeps the live
    site from showing an empty catalog without needing Shell access
    (Shell/one-off jobs require a paid Render plan)."""
    db = SessionLocal()
    try:
        if db.query(Category).count() == 0:
            populate_catalog(db)
        if db.query(AdminUser).count() == 0:
            db.add(AdminUser(username="admin", hashed_password=hash_password("aaiji@admin123")))
        db.commit()
    finally:
        db.close()
