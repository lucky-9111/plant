import { Link } from "react-router-dom";

export default function PlantCard({ plant }) {
  return (
    <Link to={`/plants/${plant.slug}`} className="card">
      <img src={plant.image_url} alt={plant.name} loading="lazy" />
      <div className="card-body">
        {plant.category && <span className="badge badge-accent">{plant.category.name}</span>}
        <h3 style={{ fontSize: "1.05rem", margin: "10px 0 6px" }}>{plant.name}</h3>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem", flex: 1 }}>
          {plant.description?.slice(0, 80)}
          {plant.description?.length > 80 ? "..." : ""}
        </p>
        <div className="price">
          &#8377;{plant.effective_price}
          {plant.discount_price ? <span className="strike">&#8377;{plant.price}</span> : null}
        </div>
      </div>
    </Link>
  );
}
