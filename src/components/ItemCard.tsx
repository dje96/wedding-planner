import { Link } from "react-router-dom";
import { CATEGORY_LABELS, type Item } from "../types";
import { formatPrice, formatRating, formatLocation } from "../lib/format";
import { StatusPill } from "./StatusPill";

export function ItemCard({ item, index = 0 }: { item: Item; index?: number }) {
  const photo = item.photos?.[0];
  const loc = formatLocation(item);
  return (
    <Link
      to={`/item/${item.id}`}
      className="card reveal"
      style={{ animationDelay: `${Math.min(index * 60, 480)}ms` }}
    >
      <div className="card-photo">
        {photo ? (
          <img src={photo} alt={item.name} loading="lazy" />
        ) : (
          <div className="no-photo">{CATEGORY_LABELS[item.type].icon}</div>
        )}
      </div>
      <div className="card-body">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
          <h3>{item.name}</h3>
        </div>
        {loc !== "—" && <div className="card-loc">{loc}</div>}
        {item.description && <p className="card-desc">{item.description}</p>}
        <div style={{ marginTop: "0.25rem" }}>
          <StatusPill status={item.status} />
        </div>
        <div className="card-foot">
          <span className="card-price">{formatPrice(item.price)}</span>
          <span className="card-rating">{formatRating(item)}</span>
        </div>
      </div>
    </Link>
  );
}
