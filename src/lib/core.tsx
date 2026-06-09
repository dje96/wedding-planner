// ---------------------------------------------------------------------------
// The per-category "core" registry.
//
// The core is the set of critically important facts shown consistently on every
// item — same cells, same order, with an explicit placeholder when a value is
// missing (so two venues never look structurally different). Every core key is
// backed by a typed struct on the Item (price, capacity, rating…); `coreField`
// resolves one and `coreFields` resolves the whole ordered set. Both the detail
// factsheet and the Compare table read this registry, so the core stays in lock-
// step across the two views.
//
// Category-specific "what you get" detail (inclusions, add-ons, restrictions)
// lives in its own three lists on the Item — see `Inclusion`/`AddOn`/
// `Restriction` in types.ts — not here.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { EVENT_TYPE_LABELS, type Category, type Item, type Inclusion, type InclusionState } from "../types";
import {
  formatPrice,
  formatRating,
  formatCapacity,
  formatLocation,
  formatSetting,
} from "./format";
import { scenarioTotal, formatTotal, isMultiNight, stayNights } from "./budget";
import { targetDateMatch, type DateMatch } from "./dates";
import { StatusPill } from "../components/StatusPill";

// Order matters — it's the render order of the core table and the Compare rows.
// Venues carry the richest core; suppliers lean on the three detail lists, so
// their core is just the shared typed facts (+ lead time for decor).
export const CORE_KEYS: Record<Category, string[]> = {
  venue: ["price", "scenarioTotal", "capacity", "setting", "eventType", "dates", "rating", "status", "location"],
  photographer: ["price", "dates", "rating", "status", "location"],
  catering: ["price", "dates", "rating", "status", "location"],
  decor: ["price", "leadTime", "dates", "rating", "status", "location"],
};

export interface CoreField {
  key: string;
  label: string;
  /** Rendered value node (already a sensible "—" when missing; check `known`). */
  node: ReactNode;
  /** False → the underlying data is missing; render as an "Unknown" placeholder. */
  known: boolean;
}

const DATE_NODE: Record<DateMatch, ReactNode> = {
  available: <span style={{ color: "var(--sage)" }}>✓ open on a target date</span>,
  conflict: <span style={{ color: "var(--st-passed)" }}>⚠ none of your dates open</span>,
  unknown: <span className="faint">check 2026 availability</span>,
};

const BUILTINS: Record<string, { label: string; resolve: (i: Item) => { node: ReactNode; known: boolean } }> = {
  price: {
    label: "Price",
    resolve: (i) => ({
      known: i.price?.amount != null,
      node: (
        <>
          {formatPrice(i.price)}
          {i.price?.note ? <div className="core-sub">{i.price.note}</div> : null}
        </>
      ),
    }),
  },
  scenarioTotal: {
    label: "Est. scenario total",
    resolve: (i) => {
      const total = scenarioTotal(i);
      return { known: total > 0, node: total > 0 ? formatTotal(total) : "—" };
    },
  },
  dates: {
    label: "Target dates",
    resolve: (i) => {
      const m = targetDateMatch(i);
      return { known: m !== "unknown", node: DATE_NODE[m] };
    },
  },
  capacity: {
    label: "Capacity",
    resolve: (i) => ({ known: i.capacity != null, node: formatCapacity(i) }),
  },
  setting: {
    label: "Setting",
    resolve: (i) => ({ known: !!i.location?.setting, node: formatSetting(i) }),
  },
  eventType: {
    label: "Event type",
    resolve: (i) => ({
      known: !!i.eventType,
      node: i.eventType
        ? isMultiNight(i)
          ? `${EVENT_TYPE_LABELS[i.eventType]} · ${stayNights(i)} nights`
          : EVENT_TYPE_LABELS[i.eventType]
        : "—",
    }),
  },
  leadTime: {
    label: "Lead time",
    resolve: (i) => ({
      known: i.availability?.leadTimeWeeks != null,
      node: i.availability?.leadTimeWeeks != null ? `${i.availability.leadTimeWeeks} wks` : "—",
    }),
  },
  rating: {
    label: "Rating",
    resolve: (i) => ({ known: i.rating?.score != null, node: formatRating(i) }),
  },
  status: {
    label: "Status",
    resolve: (i) => ({ known: !!i.status, node: <StatusPill status={i.status} /> }),
  },
  location: {
    label: "Location",
    resolve: (i) => ({ known: formatLocation(i) !== "—", node: formatLocation(i) }),
  },
};

/** Display label for a core key, independent of any item. */
export function coreLabel(key: string): string {
  return BUILTINS[key]?.label ?? key;
}

/** Resolve one core key for an item. */
export function coreField(item: Item, key: string): CoreField {
  const builtin = BUILTINS[key];
  if (!builtin) return { key, label: key, node: "—", known: false };
  const { node, known } = builtin.resolve(item);
  return { key, label: builtin.label, node, known };
}

/** Every core field for an item, in registry order. */
export function coreFields(item: Item): CoreField[] {
  return (CORE_KEYS[item.type] ?? []).map((key) => coreField(item, key));
}

// ---------------------------------------------------------------------------
// The standardized "what's included" checklist.
//
// Each category has a canonical, ordered set of inclusion items. Every venue
// answers the SAME set with one of three states (yes ✓ / unknown ? / no ✗), so
// "Tables & chairs" is worded identically everywhere and a venue that hasn't
// recorded an item shows it as "?" rather than hiding the gap. Venue-specific
// highlights that don't fit the standard set (a private island, beach access)
// ride along as "extras" — recorded Inclusions whose key isn't in the registry.
// ---------------------------------------------------------------------------

export interface InclusionDef {
  key: string;
  label: string;
}

export const INCLUSION_DEFS: Record<Category, InclusionDef[]> = {
  venue: [
    { key: "tables_chairs", label: "Tables & chairs" },
    { key: "linens", label: "Linens & place settings" },
    { key: "catering", label: "In-house catering" },
    { key: "bar", label: "Bar & alcohol service" },
    { key: "coordinator", label: "Day-of coordinator" },
    { key: "lighting", label: "Lighting" },
    { key: "sound", label: "Sound / AV" },
    { key: "restrooms", label: "Restrooms" },
    { key: "parking", label: "Parking" },
    { key: "dressing_suite", label: "Dressing / bridal suite" },
    { key: "tent", label: "Tent / covering" },
    { key: "setup_cleanup", label: "Setup & cleanup" },
  ],
  photographer: [
    { key: "coverage_hours", label: "Hours of coverage" },
    { key: "second_shooter", label: "Second shooter" },
    { key: "engagement", label: "Engagement session" },
    { key: "album", label: "Album / prints" },
    { key: "online_gallery", label: "Online gallery" },
    { key: "edited_images", label: "Edited high-res images" },
    { key: "travel", label: "Travel" },
  ],
  catering: [
    { key: "service_staff", label: "Service & wait staff" },
    { key: "tasting", label: "Menu tasting" },
    { key: "rentals", label: "Tables, linens & place settings" },
    { key: "bar_service", label: "Bar service" },
    { key: "cake", label: "Cake / dessert" },
    { key: "setup_cleanup", label: "Setup & cleanup" },
  ],
  decor: [
    { key: "design", label: "Design consultation" },
    { key: "florals", label: "Florals" },
    { key: "rentals", label: "Decor rentals" },
    { key: "delivery", label: "Delivery" },
    { key: "setup_teardown", label: "Setup & teardown" },
  ],
};

export interface InclusionRow {
  key: string;
  label: string;
  state: InclusionState;
  note?: string;
  /** True for a venue-specific extra (not part of the standard checklist). */
  extra: boolean;
}

/**
 * The full inclusion checklist for an item, in render order: every standard
 * checklist item (defaulting to `unknown` when unrecorded) followed by any
 * recorded extras. This is what the detail page renders.
 */
export function inclusionRows(item: Item): InclusionRow[] {
  const defs = INCLUSION_DEFS[item.type] ?? [];
  const recorded = new Map((item.inclusions ?? []).map((x: Inclusion) => [x.key, x]));
  const stdKeys = new Set(defs.map((d) => d.key));

  const standard: InclusionRow[] = defs.map((d) => {
    const rec = recorded.get(d.key);
    return { key: d.key, label: d.label, state: rec?.state ?? "unknown", note: rec?.note, extra: false };
  });

  const extras: InclusionRow[] = (item.inclusions ?? [])
    .filter((x: Inclusion) => !stdKeys.has(x.key))
    .map((x: Inclusion) => ({ key: x.key, label: x.label ?? x.key, state: x.state, note: x.note, extra: true }));

  return [...standard, ...extras];
}
