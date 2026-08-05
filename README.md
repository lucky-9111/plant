# Aaiji Nursery Website

A full business website for Aaiji Nursery: a React (Vite) frontend for the public site and admin
dashboard, backed by a FastAPI + SQLite JSON API.

## Architecture

```
plant/
  app/                    FastAPI backend
    models.py             SQLAlchemy models (Category -> Plant, Service, PricingPlan,
                           FAQ, Testimonial, GalleryImage, BlogPost, Inquiry, SiteSetting, AdminUser)
    schemas.py             Pydantic request/response schemas
    routers/
      api_public.py        Public read endpoints + inquiry submission (/api/...)
      api_admin.py          Admin CRUD endpoints, session-cookie protected (/api/admin/...)
    auth.py, deps.py        Password hashing + admin session dependency
    main.py                 App entrypoint; serves the built React app + the API from one process
  frontend/                React app (Vite)
    src/pages/              Public pages (Home, Plants, Services, Pricing, FAQs, Contact, ...)
    src/admin/               Admin dashboard (login, CRUD screens, settings)
    src/styles/               Theme CSS (mobile-first, responsive)
  seed.py                    Populates the database with placeholder nursery content
  requirements.txt
```

The database (`aaiji_nursery.db`, SQLite) is created automatically on first run. Categories and
Plants are normalized: each `Plant` row has a `category_id` foreign key into `Category`, matching
the "category -> plant details" structure you asked for.

## First-time setup

Run each line separately (on Windows PowerShell, `&&` is not a valid command separator —
run one command at a time, or join with `;`):

```
pip install -r requirements.txt
python seed.py
```

`python seed.py` creates + seeds `aaiji_nursery.db` and creates the admin user.

```
cd frontend
npm install
npm run build
```

`npm run build` compiles the React app to `frontend/dist`.

## Running

**Production-style (single process, recommended):**

```
python -m uvicorn app.main:app --port 8000
```

Visit `http://localhost:8000` for the public site, `http://localhost:8000/admin/login` for the
admin dashboard. FastAPI serves the built React app and the JSON API from one process.

**Development (hot reload on the frontend):**

```
# terminal 1
python -m uvicorn app.main:app --port 8000 --reload
```

```
# terminal 2
cd frontend
npm run dev
```

Then visit `http://localhost:5173` — Vite's dev server proxies `/api/*` requests to the FastAPI
backend on port 8000 (see `frontend/vite.config.js`). After making frontend changes, run
`npm run build` again before deploying/running the single-process version.

## Admin login

- URL: `/admin/login`
- Username: `admin`
- Password: `aaiji@admin123`

**Change this password before putting the site anywhere public.** There's no UI for it yet — the
fastest way is to edit `seed.py`'s admin user block and re-run `python seed.py` (this wipes and
reseeds the whole database), or hash a new password with `app.auth.hash_password()` and update the
row directly.

From the admin dashboard you can manage every section of the site without touching code:
Categories, Plants (with category assignment, pricing, stock, features), Services, Pricing Plans,
FAQs, Testimonials, Gallery, Blog, incoming Inquiries, and global Site Settings (business name,
tagline, phone, email, address, working hours, policies, etc. — these feed the header/footer and
About/Contact pages everywhere).

## Notes / next steps for a real launch

- All content (plants, prices, testimonials, business info) is placeholder data from `seed.py` —
  replace it via the admin dashboard.
- Image URLs currently point to Unsplash stock photos; swap in real product photography via the
  admin forms.
- `SessionMiddleware` in `app/main.py` uses a hardcoded dev secret key — set a real one via
  environment variable before deploying.
- No production ASGI server config (gunicorn/uvicorn workers, HTTPS) is set up — this is a
  development-ready app, not a deployed one.
