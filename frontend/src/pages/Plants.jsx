import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import PlantCard from "../components/PlantCard";
import { Loading, Empty } from "../components/Loading";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function Plants() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "";
  const activeSearch = searchParams.get("search") || "";
  useDocumentTitle("Our Plant Catalog | Aaiji Nursery");
  const [categories, setCategories] = useState(null);
  const [plants, setPlants] = useState(null);

  useEffect(() => {
    api.get("/categories").then(setCategories);
  }, []);

  useEffect(() => {
    setPlants(null);
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    if (activeSearch) params.set("search", activeSearch);
    const query = params.toString() ? `?${params.toString()}` : "";
    api.get(`/plants${query}`).then(setPlants);
  }, [activeCategory, activeSearch]);

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
          {activeSearch && (
            <div className="filter-chips">
              <button
                type="button"
                className="chip"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete("search");
                  setSearchParams(next);
                }}
              >
                Search: "{activeSearch}" <span aria-hidden="true">&times;</span>
              </button>
            </div>
          )}

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
            <Empty>
              {activeSearch
                ? `No plants found for "${activeSearch}".`
                : "No plants found in this category yet."}
            </Empty>
          ) : (
            <div className="grid grid-4 grid-plants">
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
