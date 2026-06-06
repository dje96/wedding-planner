import type { Item, Location, Price } from "../types";

const UNIT_SUFFIX: Record<NonNullable<Price["unit"]>, string> = {
  total: "",
  per_person: " pp",
  per_hour: "/hr",
  per_day: "/day",
  per_night: "/night",
  per_week: "/week",
  from: "",
};

export function formatPrice(price?: Price): string {
  if (!price || price.amount == null) return "—";
  const currency = price.currency || "USD";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price.amount);
  const prefix = price.unit === "from" ? "from " : "";
  const suffix = price.unit ? UNIT_SUFFIX[price.unit] : "";
  return `${prefix}${formatted}${suffix}`;
}

/** A single comparable number for sorting/rolling up, regardless of unit. */
export function priceValue(price?: Price): number | null {
  return price?.amount ?? null;
}

export function formatRating(item: Item): string {
  const r = item.rating;
  if (!r || r.score == null) return "—";
  const count = r.count != null ? ` (${r.count.toLocaleString("en-GB")})` : "";
  return `${r.score.toFixed(1)}★${count}`;
}

export function formatCapacity(item: Item): string {
  const c = item.capacity;
  if (!c) return "—";
  if (c.min != null && c.max != null) return `${c.min}–${c.max}`;
  if (c.seated != null) return `${c.seated} seated`;
  if (c.max != null) return `up to ${c.max}`;
  if (c.standing != null) return `${c.standing} standing`;
  return "—";
}

export function formatLocation(item: Item): string {
  const l = item.location;
  if (!l) return "—";
  return [l.city, l.region].filter(Boolean).join(", ") || l.address || "—";
}

const SETTING_LABELS: Record<NonNullable<Location["setting"]>, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  both: "Indoor, Outdoor",
};

export function formatSetting(item: Item): string {
  const s = item.location?.setting;
  return s ? SETTING_LABELS[s] : "—";
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
