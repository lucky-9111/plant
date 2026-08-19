import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useSettings } from "../context/SettingsContext";
import PlantCard from "../components/PlantCard";
import PlantExplorer from "../components/PlantExplorer";
import Stars from "../components/Stars";
import Avatar from "../components/Avatar";
import { Loading } from "../components/Loading";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function Home() {
  const settings = useSettings();
  const [categories, setCategories] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [testimonials, setTestimonials] = useState(null);

  useDocumentTitle(
    `${settings.business_name || "Aaiji Nursery"} - ${settings.tagline || "Plant Nursery & Landscaping"}`
  );

  useEffect(() => {
    api.get("/categories").then(setCategories);
    api.get("/plants?featured=true").then(setFeatured);
    api.get("/testimonials").then((data) => setTestimonials(data.slice(0, 3)));
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container">
          <div>
            <span className="tagline">{settings.tagline}</span>
            <h1>{settings.business_name || "Aaiji Nursery"}</h1>
            <p className="lead">{settings.intro}</p>
            <div className="hero-actions">
              <Link to="/plants" className="btn btn-primary">
                Browse Plants
              </Link>
              <Link to="/contact" className="btn btn-outline">
                <span className="hide-mobile">Get a Free Consultation</span>
                <span>Enquire Now</span>
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=900"
              alt="Lush green plants"
            />
          </div>
        </div>
      </section>

      <PlantExplorer />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">What we offer</span>
            <h2>Shop by Category</h2>
            <p>From indoor greens to full landscaping supplies - find exactly what your space needs.</p>
          </div>
          {!categories ? (
            <Loading />
          ) : (
            <div className="grid grid-4">
              {categories.map((cat) => (
                <Link key={cat.id} to={`/plants?category=${cat.slug}`} className="card">
                  <img src={cat.image_url} alt={cat.name} loading="lazy" />
                  <div className="card-body">
                    <h3 style={{ fontSize: "1.05rem", margin: 0 }}>{cat.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Customer favourites</span>
            <h2>Featured Plants</h2>
          </div>
          {!featured ? (
            <Loading />
          ) : (
            <div className="grid grid-4 grid-plants">
              {featured.map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="stat-row">
            <div>
              <div className="num">{settings.years_experience}+</div>
              <div className="label">Years of Experience</div>
            </div>
            <div>
              <div className="num">5000+</div>
              <div className="label">Happy Customers</div>
            </div>
            <div>
              <div className="num">150+</div>
              <div className="label">Plant Varieties</div>
            </div>
            <div>
              <div className="num">30+</div>
              <div className="label">Cities Served</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Social proof</span>
            <h2>What Our Customers Say</h2>
          </div>
          {!testimonials ? (
            <Loading />
          ) : (
            <div className="grid grid-3">
              {testimonials.map((t) => (
                <div key={t.id} className="card">
                  <div className="card-body">
                    <Stars rating={t.rating} />
                    <p style={{ marginTop: 10, color: "var(--color-text-muted)" }}>
                      &ldquo;{t.message}&rdquo;
                    </p>
                    <div className="testimonial-author">
                      <Avatar name={t.customer_name} src={t.image_url} size={40} />
                      <strong>{t.customer_name}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
