import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "../types";
import { itemsByCategory } from "../data";
import { ItemCard } from "../components/ItemCard";
import { FilterBar } from "../components/FilterBar";
import { applyFilters, EMPTY_FILTER, hasActiveFilters } from "../lib/filters";

const LEDE: Record<Category, string> = {
  venue: "The places in the running. Each one anchors a full scenario of suppliers.",
  photographer: "Who'll capture the day. Compare coverage, style and price.",
  catering: "Feeding everyone. Watch the per-head numbers against your headcount.",
  decor: "Florals, styling and the finishing touches.",
};

export function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  // Reset filters whenever the category param changes (router keeps this
  // component instance mounted across /category/:category swaps).
  const [filters, setFilters] = useState(EMPTY_FILTER);
  const [lastCat, setLastCat] = useState(category);
  if (category !== lastCat) {
    setLastCat(category);
    setFilters(EMPTY_FILTER);
  }

  if (!category || !CATEGORIES.includes(category as Category)) {
    return <Navigate to="/" replace />;
  }
  const cat = category as Category;
  const items = itemsByCategory(cat);
  const meta = CATEGORY_LABELS[cat];
  const filtered = applyFilters(items, filters);

  return (
    <>
      <div className="page-head reveal">
        <div className="eyebrow">
          {meta.icon} {items.length} {items.length === 1 ? "option" : "options"}
        </div>
        <h1>{meta.plural}</h1>
        <p className="lede">{LEDE[cat]}</p>
        {items.length > 1 && (
          <Link to={`/compare?cat=${cat}`} className="btn-link" style={{ marginTop: "1rem" }}>
            ⇄ Compare these side by side
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-mark">{meta.icon}</div>
          No {meta.plural.toLowerCase()} yet. Paste me a link and I'll add one.
        </div>
      ) : (
        <>
          <FilterBar
            items={items}
            value={filters}
            onChange={setFilters}
            resultCount={filtered.length}
            noun="option"
          />
          {filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-mark">{meta.icon}</div>
              No {meta.plural.toLowerCase()} match these filters.
              {hasActiveFilters(filters) && (
                <div style={{ marginTop: "0.75rem" }}>
                  <button className="btn-link" onClick={() => setFilters(EMPTY_FILTER)}>
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card-grid">
              {filtered.map((item, i) => (
                <ItemCard key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
