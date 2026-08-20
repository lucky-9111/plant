import { Link } from "react-router-dom";
import PlantCard from "./PlantCard";

// Mobile-only horizontal browsing section for the landing page (see
// .plant-carousel* rules in index.css, scoped to the mobile breakpoint —
// desktop never renders this component at all, see Home.jsx). Reuses
// PlantCard as-is so Add to Cart / Buy Now / Wishlist keep working exactly
// like everywhere else; only the surrounding layout differs.
export default function PlantCarousel({ title, viewAllHref, plants }) {
  if (!plants || plants.length === 0) return null;

  return (
    <div className="plant-carousel">
      <div className="plant-carousel-head">
        <h3>{title}</h3>
        <Link to={viewAllHref} className="plant-carousel-viewall">
          See All &rarr;
        </Link>
      </div>
      <div className="plant-carousel-track">
        {plants.map((plant) => (
          <div key={plant.id} className="plant-carousel-item">
            <PlantCard plant={plant} />
          </div>
        ))}
      </div>
    </div>
  );
}
