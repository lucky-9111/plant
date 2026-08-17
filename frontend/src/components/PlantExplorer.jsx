import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import PlantCard from "./PlantCard";
import { Loading, Empty } from "./Loading";

const PRICE_MAX = 20000;
const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 400;

const SORT_OPTIONS = [
  { value: "", label: "Relevance" },
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A to Z" },
];

export default function PlantExplorer() {
  const [categories, setCategories] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([0, PRICE_MAX]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    api.get("/categories").then(setCategories);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategories, priceRange, inStockOnly, sortBy]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedCategories.length) params.set("category", selectedCategories.join(","));
    if (priceRange[0] > 0) params.set("min_price", priceRange[0]);
    if (priceRange[1] < PRICE_MAX) params.set("max_price", priceRange[1]);
    if (inStockOnly) params.set("in_stock", "true");
    if (sortBy) params.set("sort_by", sortBy);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    let cancelled = false;
    api
      .getPaged(`/plants?${params.toString()}`)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedCategories, priceRange, inStockOnly, sortBy, page]);

  function toggleCategory(slug) {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function clearSearch() {
    setSearch("");
    setDebouncedSearch("");
  }

  function clearAll() {
    clearSearch();
    setSelectedCategories([]);
    setPriceRange([0, PRICE_MAX]);
    setInStockOnly(false);
    setSortBy("");
  }

  const activeChips = useMemo(() => {
    const chips = [];
    if (debouncedSearch) {
      chips.push({ key: "search", label: `"${debouncedSearch}"`, clear: clearSearch });
    }
    selectedCategories.forEach((slug) => {
      const cat = categories?.find((c) => c.slug === slug);
      chips.push({ key: `cat-${slug}`, label: cat?.name || slug, clear: () => toggleCategory(slug) });
    });
    if (priceRange[0] > 0 || priceRange[1] < PRICE_MAX) {
      chips.push({
        key: "price",
        label: `₹${priceRange[0]} - ₹${priceRange[1]}`,
        clear: () => setPriceRange([0, PRICE_MAX]),
      });
    }
    if (inStockOnly) {
      chips.push({ key: "stock", label: "In Stock", clear: () => setInStockOnly(false) });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedCategories, priceRange, inStockOnly, categories]);

  const hasActiveFilters = activeChips.length > 0;

  return (
    <section className="section" id="explore">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Find your plant</span>
          <h2>Search &amp; Filter Plants</h2>
          <p>Search by name, then narrow down by category, price, and availability.</p>
        </div>

        <div className="explorer-searchbar">
          <span className="explorer-search-icon" aria-hidden="true">
            &#128269;
          </span>
          <input
            type="search"
            className="form-control explorer-search-input"
            placeholder="Search plants e.g. rose, money plant, cactus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search plants"
          />
          <button
            type="button"
            className="btn btn-outline dark explorer-filter-toggle"
            onClick={() => setFiltersOpen(true)}
          >
            Filters {hasActiveFilters ? `(${activeChips.length})` : ""}
          </button>
        </div>

        {hasActiveFilters && (
          <div className="filter-chips">
            {activeChips.map((chip) => (
              <button key={chip.key} type="button" className="chip" onClick={chip.clear}>
                {chip.label} <span aria-hidden="true">&times;</span>
              </button>
            ))}
            <button type="button" className="chip chip-clear" onClick={clearAll}>
              Clear all filters
            </button>
          </div>
        )}

        <div className="explorer-layout">
          <aside className={`explorer-filters ${filtersOpen ? "open" : ""}`}>
            <div className="explorer-filters-head">
              <h3>Filters</h3>
              <button
                type="button"
                className="explorer-filters-close"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
              >
                &times;
              </button>
            </div>

            <div className="filter-group">
              <h4>Category</h4>
              {!categories ? (
                <Loading />
              ) : (
                categories.map((cat) => (
                  <label key={cat.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.slug)}
                      onChange={() => toggleCategory(cat.slug)}
                    />
                    {cat.name}
                  </label>
                ))
              )}
            </div>

            <div className="filter-group">
              <h4>Price Range</h4>
              <div className="price-range-values">
                <span>&#8377;{priceRange[0]}</span>
                <span>&#8377;{priceRange[1]}</span>
              </div>
              <div className="dual-range">
                <input
                  type="range"
                  min={0}
                  max={PRICE_MAX}
                  step={50}
                  value={priceRange[0]}
                  onChange={(e) =>
                    setPriceRange(([, max]) => [Math.min(Number(e.target.value), max), max])
                  }
                  aria-label="Minimum price"
                />
                <input
                  type="range"
                  min={0}
                  max={PRICE_MAX}
                  step={50}
                  value={priceRange[1]}
                  onChange={(e) =>
                    setPriceRange(([min]) => [min, Math.max(Number(e.target.value), min)])
                  }
                  aria-label="Maximum price"
                />
              </div>
            </div>

            <div className="filter-group">
              <h4>Availability</h4>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                />
                In stock only
              </label>
            </div>

            <div className="filter-group">
              <h4>Sort By</h4>
              <select
                className="form-control"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block explorer-filters-apply"
              onClick={() => setFiltersOpen(false)}
            >
              Show Results
            </button>
          </aside>

          {filtersOpen && (
            <div
              className="explorer-filters-backdrop"
              onClick={() => setFiltersOpen(false)}
              aria-hidden="true"
            />
          )}

          <div className="explorer-results">
            {loading ? (
              <Loading />
            ) : !result || result.items.length === 0 ? (
              <Empty>No plants found. Try a different search or adjust your filters.</Empty>
            ) : (
              <>
                <p className="explorer-result-count">
                  {result.total} plant{result.total !== 1 ? "s" : ""} found
                </p>
                <div className="grid grid-3">
                  {result.items.map((plant) => (
                    <PlantCard key={plant.id} plant={plant} />
                  ))}
                </div>
                {result.pages > 1 && (
                  <div className="explorer-pagination">
                    <button
                      type="button"
                      className="btn btn-outline dark btn-sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Prev
                    </button>
                    <span>
                      Page {result.page} of {result.pages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline dark btn-sm"
                      disabled={page >= result.pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
