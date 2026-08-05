import { useSettings } from "../context/SettingsContext";

export default function About() {
  const settings = useSettings();

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>About Us</h1>
          <p>Builds trust and credibility, one plant at a time.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: "center" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--color-accent)", fontWeight: 700 }}>
                Our Story
              </span>
              <h2>What We Do</h2>
              <p>{settings.about_text}</p>
              <div className="stat-row" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 28 }}>
                <div>
                  <div className="num">{settings.years_experience}+</div>
                  <div className="label">Years of Experience</div>
                </div>
                <div>
                  <div className="num">5000+</div>
                  <div className="label">Happy Customers</div>
                </div>
              </div>
            </div>
            <img
              className="card"
              style={{ aspectRatio: "4/3", objectFit: "cover" }}
              src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=900"
              alt="Our nursery"
            />
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Meet the people</span>
            <h2>Our Team</h2>
          </div>
          <p style={{ textAlign: "center", maxWidth: 700, margin: "0 auto" }}>
            {settings.team_details}
          </p>
        </div>
      </section>
    </>
  );
}
