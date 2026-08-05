import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import PlantCard from "../components/PlantCard";
import { Loading, Empty } from "../components/Loading";

export default function Plants() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "";
  const [categories, setCategories] = useState(null);
  const [plants, setPlants] = useState(null);

  useEffect(() => {
    api.get("/categories").then(setCategories);
  }, []);

  useEffect(() => {
    setPlants(null);
    const query = activeCategory ? `?category=${activeCategory}` : "";
    api.get(`/plants${query}`).then(setPlants);
  }, [activeCategory]);

  function selectCategory(slug) {
    if (slug) setSearchParams({ category: slug });
    else setSearchParams({});
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Our Plant Catalog</h1>
          <p>Clarifies exactly what is offered - browse by category and find your perfect plant.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="category-pills">
            <button
              className={`pill ${!activeCategory ? "active" : ""}`}
              onClick={() => selectCategory("")}
            >
              All
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                className={`pill ${activeCategory === cat.slug ? "active" : ""}`}
                onClick={() => selectCategory(cat.slug)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {!plants ? (
            <Loading />
          ) : plants.length === 0 ? (
            <Empty>No plants found in this category yet.</Empty>
          ) : (
            <div className="grid grid-4">
              {plants.map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
