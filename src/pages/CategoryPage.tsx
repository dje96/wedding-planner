import { Link, Navigate, useParams } from "react-router-dom";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "../types";
import { itemsByCategory } from "../data";
import { ItemCard } from "../components/ItemCard";

const LEDE: Record<Category, string> = {
  venue: "The places in the running. Each one anchors a full scenario of suppliers.",
  photographer: "Who'll capture the day. Compare coverage, style and price.",
  catering: "Feeding everyone. Watch the per-head numbers against your headcount.",
  decor: "Florals, styling and the finishing touches.",
};

export function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  if (!category || !CATEGORIES.includes(category as Category)) {
    return <Navigate to="/" replace />;
  }
  const cat = category as Category;
  const items = itemsByCategory(cat);
  const meta = CATEGORY_LABELS[cat];

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
        <div className="card-grid">
          {items.map((item, i) => (
            <ItemCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
