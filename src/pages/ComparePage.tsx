import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  STATUS_LABELS,
  type Category,
  type Item,
} from "../types";
import { itemsByCategory, getItem } from "../data";
import {
  formatPrice,
  formatRating,
  formatCapacity,
  formatLocation,
  formatSetting,
  formatDate,
} from "../lib/format";
import { estimatedCost } from "../lib/budget";

type SortKey = "price" | "rating" | "name";

interface Row {
  label: string;
  /** lower-is-better numeric for "best" badge, or null to skip highlighting */
  best?: "min" | "max";
  value: (item: Item) => number | null;
  render: (item: Item) => ReactNode;
}

function buildRows(cat: Category, maxPrice: number): Row[] {
  const rows: Row[] = [
    {
      label: cat === "venue" ? "Est. cost" : "Price",
      best: "min",
      value: (i) => (i.price?.amount != null ? estimatedCost(i) : null),
      render: (i) => (
        <div>
          <span className="cell-num">{formatPrice(i.price)}</span>
          {i.price?.amount != null && maxPrice > 0 && (
            <div className="pbar">
              <span style={{ width: `${(estimatedCost(i) / maxPrice) * 100}%` }} />
            </div>
          )}
          {i.price?.note && (
            <div className="faint" style={{ fontSize: "0.74rem", marginTop: "0.3rem" }}>
              {i.price.note}
            </div>
          )}
        </div>
      ),
    },
    {
      label: "Rating",
      best: "max",
      value: (i) => i.rating?.score ?? null,
      render: (i) => <span className="cell-num">{formatRating(i)}</span>,
    },
    {
      label: "Status",
      value: () => null,
      render: (i) => (i.status ? STATUS_LABELS[i.status] : "—"),
    },
    {
      label: "Location",
      value: () => null,
      render: (i) => formatLocation(i),
    },
  ];

  if (cat === "venue") {
    rows.splice(2, 0, {
      label: "Capacity",
      best: "max",
      value: (i) => i.capacity?.max ?? i.capacity?.seated ?? null,
      render: (i) => <span className="cell-num">{formatCapacity(i)}</span>,
    });
    rows.push(
      {
        label: "Event type",
        value: () => null,
        render: (i) =>
          i.eventType
            ? `${EVENT_TYPE_LABELS[i.eventType]}${
                i.eventType === "family_stay" && i.stayNights ? ` · ${i.stayNights} nights` : ""
              }`
            : "—",
      },
      {
        label: "Setting",
        value: () => null,
        render: (i) => formatSetting(i),
      },
      {
        label: "Next open date",
        value: () => null,
        render: (i) => formatDate(i.availability?.openDates?.[0]),
      }
    );
  } else {
    rows.push({
      label: "Paired venue",
      value: () => null,
      render: (i) => {
        const v = i.venueId ? getItem(i.venueId) : undefined;
        return v ? <Link to={`/item/${v.id}`} className="btn-link">{v.name}</Link> : "Unassigned";
      },
    });
  }
  return rows;
}

function bestId(items: Item[], row: Row): string | null {
  const scored = items
    .map((i) => ({ id: i.id, v: row.value(i) }))
    .filter((x): x is { id: string; v: number } => x.v != null);
  if (scored.length < 2) return null;
  const winner =
    row.best === "min"
      ? scored.reduce((a, b) => (b.v < a.v ? b : a))
      : scored.reduce((a, b) => (b.v > a.v ? b : a));
  return winner.id;
}

export function ComparePage() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("cat") as Category) || "venue";
  const [cat, setCat] = useState<Category>(
    CATEGORIES.includes(initial) ? initial : "venue"
  );
  const [sort, setSort] = useState<SortKey>("price");

  const items = useMemo(() => {
    const list = [...itemsByCategory(cat)];
    list.sort((a, b) => {
      if (sort === "price") return estimatedCost(a) - estimatedCost(b) || 0;
      if (sort === "rating") return (b.rating?.score ?? 0) - (a.rating?.score ?? 0);
      return a.name.localeCompare(b.name);
    });
    // Items with no price drop to the end when sorting by price.
    if (sort === "price") {
      list.sort((a, b) => {
        const av = a.price?.amount == null ? 1 : 0;
        const bv = b.price?.amount == null ? 1 : 0;
        return av - bv;
      });
    }
    return list;
  }, [cat, sort]);

  const maxPrice = Math.max(0, ...items.map((i) => estimatedCost(i)));
  const rows = buildRows(cat, maxPrice);
  const meta = CATEGORY_LABELS[cat];

  function changeCat(next: Category) {
    setCat(next);
    setParams(next === "venue" ? {} : { cat: next });
  }

  return (
    <>
      <div className="page-head reveal">
        <div className="eyebrow">Side by side</div>
        <h1>
          Compare <span className="serif-italic">options</span>
        </h1>
        <p className="lede">
          Line up everything in a category and read it like a spec sheet. The{" "}
          <span style={{ color: "var(--sage)", fontWeight: 600 }}>best</span> value in each row is
          flagged — cheapest price, highest rating{cat === "venue" ? ", largest capacity" : ""}.
        </p>
      </div>

      <div className="compare-controls">
        <div className="seg">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={c === cat ? "active" : ""}
              onClick={() => changeCat(c)}
            >
              {CATEGORY_LABELS[c].plural}
            </button>
          ))}
        </div>
        <div className="seg">
          {(["price", "rating", "name"] as SortKey[]).map((s) => (
            <button key={s} className={s === sort ? "active" : ""} onClick={() => setSort(s)}>
              {s === "price" ? "By price" : s === "rating" ? "By rating" : "A–Z"}
            </button>
          ))}
        </div>
      </div>

      {items.length < 1 ? (
        <div className="empty">
          <div className="empty-mark">{meta.icon}</div>
          Nothing to compare yet in {meta.plural.toLowerCase()}.
        </div>
      ) : (
        <div className="compare-wrap reveal" style={{ animationDelay: "80ms" }}>
          <table className="compare">
            <thead>
              <tr>
                <th className="row-label" />
                {items.map((item) => (
                  <th key={item.id}>
                    <Link to={`/item/${item.id}`}>
                      {item.photos?.[0] && (
                        <img className="col-photo" src={item.photos[0]} alt="" loading="lazy" />
                      )}
                      <div className="col-name">{item.name}</div>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const winner = row.best ? bestId(items, row) : null;
                return (
                  <tr key={row.label}>
                    <td className="row-label">{row.label}</td>
                    {items.map((item) => (
                      <td key={item.id} className={item.id === winner ? "best" : undefined}>
                        {row.render(item)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
