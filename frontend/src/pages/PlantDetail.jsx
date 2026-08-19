import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import PlantCard from "../components/PlantCard";
import AddToCartButton from "../components/AddToCartButton";
import BuyNowButton from "../components/BuyNowButton";
import WishlistButton from "../components/WishlistButton";
import { Loading, Empty } from "../components/Loading";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function PlantDetail() {
  const { slug } = useParams();
  const [plant, setPlant] = useState(null);
  const [related, setRelated] = useState(null);
  const [notFound, setNotFound] = useState(false);
  useDocumentTitle(plant ? `${plant.name} | Aaiji Nursery` : "Plant Details | Aaiji Nursery");

  useEffect(() => {
    setPlant(null);
    setNotFound(false);
    api
      .get(`/plants/${slug}`)
      .then(setPlant)
      .catch(() => setNotFound(true));
    api.get(`/plants/${slug}/related`).then(setRelated).catch(() => setRelated([]));
  }, [slug]);

  if (notFound) {
    return (
      <div className="section container">
        <Empty>Plant not found.</Empty>
        <div style={{ textAlign: "center" }}>
          <Link to="/plants" className="btn btn-primary">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  if (!plant) return <Loading />;

  return (
    <>
      <section className="section">
        <div className="container">
          <div className="grid grid-2">
            <img
              className="card"
              style={{ aspectRatio: "4/3", objectFit: "cover" }}
              src={plant.image_url}
              alt={plant.name}
            />
            <div>
              {plant.category && (
                <Link to={`/plants?category=${plant.category.slug}`} className="badge badge-accent">
                  {plant.category.name}
                </Link>
              )}
              <h1 style={{ marginTop: 14 }}>{plant.name}</h1>
              <div className="plant-meta">
                <span className="badge badge-muted">Care: {plant.care_level}</span>
                <span
                  className={`badge ${plant.stock_quantity > 0 ? "badge-accent" : "badge-gold"}`}
                >
                  {plant.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                </span>
                {plant.sku && <span className="badge badge-muted">SKU: {plant.sku}</span>}
              </div>
              <div className="price" style={{ fontSize: "1.6rem", marginBottom: 16 }}>
                &#8377;{plant.effective_price}
                {plant.discount_price ? <span className="strike">&#8377;{plant.price}</span> : null}
              </div>
              <p>{plant.description}</p>
              {plant.feature_list?.length > 0 && (
                <ul className="feature-list" style={{ marginBottom: 24 }}>
                  {plant.feature_list.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <AddToCartButton plant={plant} />
                <BuyNowButton plant={plant} />
                <WishlistButton plant={plant} />
                <Link
                  to={`/contact?plant_id=${plant.id}&plant_name=${encodeURIComponent(plant.name)}`}
                  className="btn btn-outline dark"
                >
                  Enquire About This Plant
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {related && related.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <h2>You Might Also Like</h2>
            </div>
            <div className="grid grid-4 grid-plants">
              {related.map((p) => (
                <PlantCard key={p.id} plant={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
