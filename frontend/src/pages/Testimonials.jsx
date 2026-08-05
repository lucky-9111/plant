import { useEffect, useState } from "react";
import { api } from "../api";
import { Loading, Empty } from "../components/Loading";
import Stars from "../components/Stars";

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState(null);

  useEffect(() => {
    api.get("/testimonials").then(setTestimonials);
  }, []);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Testimonials</h1>
          <p>Social proof from real customers.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {!testimonials ? (
            <Loading />
          ) : testimonials.length === 0 ? (
            <Empty>No testimonials yet.</Empty>
          ) : (
            <div className="grid grid-3">
              {testimonials.map((t) => (
                <div key={t.id} className="card">
                  <div className="card-body">
                    <Stars rating={t.rating} />
                    <p style={{ marginTop: 10, color: "var(--color-text-muted)", flex: 1 }}>
                      &ldquo;{t.message}&rdquo;
                    </p>
                    <strong>{t.customer_name}</strong>
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
