// ---------------------------------------------------------------------------
// Faceted filtering for the option grids (Review tab + category pages).
//
// Three facets, all derived from the items actually present so the controls
// never offer a value that would return nothing:
//   - state    — the US state, parsed out of `location` (e.g. "Maryland")
//   - type     — venue `eventType` (day-of vs family stay)
//   - tag      — any of the item's free `tags`
//
// Semantics follow standard faceted search: OR *within* a facet (picking two
// states widens to either), AND *across* facets (a state and a tag narrows to
// both). Empty facet = no constraint from that facet.
// ---------------------------------------------------------------------------

import { EVENT_TYPE_LABELS, type EventType, type Item } from "../types";

/** US state abbreviation → full name, for parsing and labelling. */
const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

/** Best-effort US state (full name) for an item, from its location fields.
 *  Prefers a trailing 2-letter code (e.g. "…, MD"); falls back to a full state
 *  name appearing anywhere in the location text. Returns undefined if neither. */
export function stateOf(item: Item): string | undefined {
  const hay = [item.location?.region, item.location?.address, item.location?.city]
    .filter(Boolean)
    .join(", ");
  if (!hay) return undefined;

  // Last 2-letter uppercase token that is a known state code wins (region
  // strings end in the state, e.g. "Edgewater (near Annapolis), MD").
  const codes = hay.match(/\b[A-Z]{2}\b/g) ?? [];
  for (let i = codes.length - 1; i >= 0; i--) {
    if (US_STATES[codes[i]]) return US_STATES[codes[i]];
  }
  // Otherwise look for a spelled-out state name.
  for (const name of Object.values(US_STATES)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(hay)) return name;
  }
  return undefined;
}

export interface FilterState {
  states: string[];
  types: EventType[];
  tags: string[];
}

export const EMPTY_FILTER: FilterState = { states: [], types: [], tags: [] };

export function hasActiveFilters(f: FilterState): boolean {
  return f.states.length > 0 || f.types.length > 0 || f.tags.length > 0;
}

/** One selectable filter value plus how many items carry it. */
export interface Facet {
  value: string;
  label: string;
  count: number;
}

export interface Facets {
  states: Facet[];
  types: Facet[];
  tags: Facet[];
}

function tally(values: Array<[string, string]>): Facet[] {
  // values: [value, label] pairs (one per occurrence). Group → counts.
  const map = new Map<string, Facet>();
  for (const [value, label] of values) {
    const f = map.get(value);
    if (f) f.count += 1;
    else map.set(value, { value, label, count: 1 });
  }
  return [...map.values()];
}

/** Build the available facets from a set of items. Each facet is sorted by
 *  count (desc) then label, and only includes values actually present. */
export function buildFacets(items: Item[]): Facets {
  const states = tally(
    items.flatMap((it) => {
      const s = stateOf(it);
      return s ? [[s, s] as [string, string]] : [];
    }),
  ).sort(byCountThenLabel);

  const types = tally(
    items.flatMap((it) =>
      it.eventType ? [[it.eventType, EVENT_TYPE_LABELS[it.eventType]] as [string, string]] : [],
    ),
  ).sort(byCountThenLabel);

  const tags = tally(
    items.flatMap((it) => (it.tags ?? []).map((t) => [t, t] as [string, string])),
  ).sort(byCountThenLabel);

  return { states, types, tags };
}

function byCountThenLabel(a: Facet, b: Facet): number {
  return b.count - a.count || a.label.localeCompare(b.label);
}

/** Apply the active filters: OR within each facet, AND across facets. */
export function applyFilters(items: Item[], f: FilterState): Item[] {
  return items.filter((it) => {
    if (f.states.length && !f.states.includes(stateOf(it) ?? "")) return false;
    if (f.types.length && !(it.eventType && f.types.includes(it.eventType))) return false;
    if (f.tags.length) {
      const tags = it.tags ?? [];
      if (!f.tags.some((t) => tags.includes(t))) return false;
    }
    return true;
  });
}

/** Toggle a value in one of the facet arrays, returning a new FilterState. */
export function toggleFilter(f: FilterState, facet: keyof FilterState, value: string): FilterState {
  const current = f[facet] as string[];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  return { ...f, [facet]: next };
}
