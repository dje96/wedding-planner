// ---------------------------------------------------------------------------
// The wedding-planner data model.
//
// Every option (a venue, photographer, caterer or decor supplier) is stored as
// a single JSON file under `data/<category>/<slug>.json` and conforms to the
// `Item` shape below. The venue is the organising key: photographers, catering
// and decor each reference the venue they are being considered for via
// `venueId`. An item with `venueId: null` is "unassigned" — still on the table,
// not yet tied to a specific venue scenario.
//
// When ingesting from a link, fill in whatever the page actually provides and
// leave the rest undefined. Nothing here is required except `id`, `type`,
// `name` and `url` — the UI degrades gracefully when fields are missing.
// ---------------------------------------------------------------------------

export type Category = "venue" | "photographer" | "catering" | "decor";

export const CATEGORIES: Category[] = ["venue", "photographer", "catering", "decor"];

/**
 * How a venue would be used:
 * - `family_stay`: the venue is rented for several days and the wedding doubles
 *   as a holiday. `stayNights` drives the rental cost (beachfront homes default
 *   to a 7-night week — see ASSUMED_STAY_NIGHTS in config).
 * - `weekend_rental`: an Airbnb-type home rented just for the wedding weekend —
 *   the venue, but not a full holiday. Defaults to 2 nights (Fri–Sun — see
 *   WEEKEND_RENTAL_NIGHTS in config); `stayNights` drives the rental cost.
 * - `day_of`: a more typical single-day celebration.
 */
export type EventType = "family_stay" | "weekend_rental" | "day_of";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  family_stay: "Family stay",
  weekend_rental: "Weekend rental",
  day_of: "Day-of event",
};

export const CATEGORY_LABELS: Record<Category, { singular: string; plural: string; icon: string }> = {
  venue: { singular: "Venue", plural: "Venues", icon: "🏛️" },
  photographer: { singular: "Photographer", plural: "Photographers", icon: "📷" },
  catering: { singular: "Caterer", plural: "Catering", icon: "🍽️" },
  decor: { singular: "Decor", plural: "Decor", icon: "🌸" },
};

/** Where an option sits in your decision pipeline. */
export type Status = "considering" | "shortlisted" | "contacted" | "quoted" | "booked" | "passed";

export const STATUS_ORDER: Status[] = [
  "considering",
  "shortlisted",
  "contacted",
  "quoted",
  "booked",
  "passed",
];

export const STATUS_LABELS: Record<Status, string> = {
  considering: "Considering",
  shortlisted: "Shortlisted",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  passed: "Passed",
};

export interface Price {
  /** Numeric amount in major currency units (e.g. 8500 for £8,500). */
  amount?: number;
  currency?: string; // ISO code, e.g. "GBP", "USD". Defaults to GBP in the UI.
  /** How the price is charged, for honest comparison. */
  unit?: "total" | "per_person" | "per_hour" | "per_day" | "per_night" | "per_week" | "from";
  /** Free-text qualifier, e.g. "Saturday, peak season" or "8-hour package". */
  note?: string;
}

export interface Capacity {
  min?: number;
  max?: number;
  seated?: number;
  standing?: number;
}

export interface Location {
  address?: string;
  city?: string;
  region?: string;
  /** Whether the space is indoor, outdoor, or both. */
  setting?: "indoor" | "outdoor" | "both";
}

export interface Availability {
  /** Specific dates known to be open, ISO yyyy-mm-dd. */
  openDates?: string[];
  /** Typical booking lead time in weeks, if stated. */
  leadTimeWeeks?: number;
  notes?: string;
}

export interface Rating {
  /** Average score, normalised to a 5-point scale. */
  score?: number;
  /** Number of reviews behind the score. */
  count?: number;
  /** Where the rating came from, e.g. "Google", "Hitched". */
  source?: string;
  awards?: string[];
}

export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
  /** Booking / enquiry page, if different from the main `url`. */
  website?: string;
}

/**
 * A caveat surfaced on an option — either an **unknown** a Scout run couldn't
 * verify (e.g. catering policy not published) or a **warn** notice that
 * conflicts with a stated preference (e.g. a venue that requires an approved
 * caterer list, or a price over the category limit). Rendered as a warning pill
 * in the Review tab and as a notices block on the option's detail page.
 *
 * These are *authored* (Scout writes them, and they're hand-editable) — distinct
 * from the budget/capacity/date fit flags the UI computes from settings in
 * `src/lib/scout.ts`. Use `flags` for caveats those computed checks can't see.
 * Preserved when a candidate is promoted from the Review queue to a tracked
 * option, so a known gap stays visible until it's resolved.
 */
export interface ItemFlag {
  /** "unknown" = a neutral gap to confirm (amber); "warn" = a caveat that conflicts with a preference (red). */
  level: "unknown" | "warn";
  /** Short pill text, e.g. "Catering policy unconfirmed". */
  label: string;
  /** Optional longer explanation shown as a tooltip and in the detail notices block. */
  detail?: string;
}

// ---------------------------------------------------------------------------
// Category-specific detail — the three questions every option has to answer:
//   1. What's included in the price?        → `inclusions`
//   2. What optional add-ons, at what cost? → `addOns`
//   3. What are the restrictions?           → `restrictions`
// Each is its own list with a purpose-built shape (replacing the old free-text
// `attributes` map). The detail page renders all three sections for every item,
// even when empty — an empty section reads as "not recorded yet", so a gap is
// visible rather than hidden.
// ---------------------------------------------------------------------------

/**
 * Whether the price covers a given thing:
 * - `yes`     → covered (green ✓)
 * - `unknown` → not confirmed either way (grey ?) — the default for any standard
 *   checklist item we haven't recorded, so a gap is visible rather than implied.
 * - `no`      → explicitly NOT covered (red ✗), e.g. catering you must arrange.
 */
export type InclusionState = "yes" | "unknown" | "no";

/**
 * One line of the "what's included" checklist. Two flavours:
 * - **Standard** — `key` matches an entry in the per-category checklist
 *   (`INCLUSION_DEFS` in `src/lib/core.tsx`); the label comes from there, so
 *   "Tables & chairs" is worded identically across every venue. The full
 *   standard checklist always renders; an unrecorded item shows as `unknown`.
 * - **Extra** — a venue-specific highlight not in the standard list (e.g.
 *   "Private beach access"); `key` is a custom slug and `label` carries the
 *   wording. These render after the standard rows.
 * The venue-specific qualifier ("basic", "seats 200", "white resin") lives in
 * `note`, keeping the label standardized.
 */
export interface Inclusion {
  /** Canonical checklist key, or a custom slug for a venue-specific extra. */
  key: string;
  /** Whether the price covers it: yes ✓ / unknown ? / no ✗. */
  state: InclusionState;
  /** Display label for an extra (custom key). Standard keys take their label
   *  from the registry and ignore this. */
  label?: string;
  /** Venue-specific qualifier, e.g. "basic", "seats 200", "white resin". */
  note?: string;
}

/** An optional paid extra and its cost. Add-on prices are NOT rolled into the
 *  budget — they're conditional on choosing the extra. */
export interface AddOn {
  /** What it is, e.g. "Marquee", "Extra hour of coverage". */
  label: string;
  /** The cost of the add-on (reuses the shared `Price` shape; `unit` lets you
   *  say per_hour / per_person / total etc.). */
  price?: Price;
  /** Optional qualifier, e.g. "if outside the included 8 hours". */
  note?: string;
}

/** A venue/supplier rule or limitation. */
export interface Restriction {
  /** The subject of the rule, e.g. "Amplified music", "Catering". */
  label: string;
  /** The rule itself, e.g. "Must end by 11pm", "Approved vendor list only". */
  note?: string;
}

export interface Item {
  /** Stable slug, matches the filename. e.g. "the-oak-barn". */
  id: string;
  type: Category;
  name: string;
  /** The source link the details were pulled from. */
  url: string;

  /** For non-venue items: the venue this option is paired with. null = unassigned. */
  venueId?: string | null;

  description?: string;
  /** Remote image URLs pulled from the source page. */
  photos?: string[];

  price?: Price;
  capacity?: Capacity;
  location?: Location;
  availability?: Availability;
  rating?: Rating;
  contact?: Contact;

  /** Venues only: how you'd use this venue. */
  eventType?: EventType;
  /** Venues only, for `family_stay` / `weekend_rental`: number of nights rented.
   *  Drives the rental cost when the price is a weekly or per-night rate. */
  stayNights?: number;

  status?: Status;
  /** Your own running notes — the one field expected to be hand-edited. */
  notes?: string;
  tags?: string[];

  /** Caveats worth a warning pill: unknowns to confirm or notices that conflict
   *  with a preference. See `ItemFlag`. Authored by Scout, hand-editable. */
  flags?: ItemFlag[];

  /** What the price includes (and notable exclusions). See `Inclusion`. */
  inclusions?: Inclusion[];
  /** Optional paid extras and their cost. See `AddOn`. */
  addOns?: AddOn[];
  /** Rules and limitations. See `Restriction`. */
  restrictions?: Restriction[];

  /** ISO timestamp set when the item was ingested. */
  addedAt?: string;

  // -- Review queue only (candidates written by Scout into data/review/) -----
  /** Scout's one-line reason this candidate fits / what's unknown. */
  scoutNote?: string;
  /** ISO date a Scout run surfaced this candidate. */
  scoutedAt?: string;
}

/**
 * Per-category planning preferences, hand-set by Duncan in the Preferences tab
 * and stored in `data/preferences.json`. Two knobs per category:
 * - `priceLimit`: a spend ceiling for this area, in CURRENCY (config.ts). It's a
 *   soft target Scout flags against — distinct from the overall `BUDGET`.
 * - `context`: free-text describing the vibe / style / must-haves Duncan wants
 *   in this area. Fed verbatim to the `/scout` skill so research matches taste.
 * Both are optional; an unset category simply contributes no extra steer.
 */
export interface CategoryPreference {
  priceLimit?: number;
  context?: string;
}

/** The full preferences map: one entry per category. */
export type Preferences = Record<Category, CategoryPreference>;

/** A blank preferences map — every category present, nothing set. */
export function emptyPreferences(): Preferences {
  return Object.fromEntries(CATEGORIES.map((c) => [c, {}])) as Preferences;
}

/**
 * A candidate Scout has rejected — recorded in `data/dismissed.json` so future
 * Scout runs skip it. Matched on `url` (preferred) or `name` + `category`.
 */
export interface DismissedEntry {
  id: string;
  name: string;
  url: string;
  category: Category;
  /** ISO date the candidate was dismissed. */
  dismissedAt?: string;
  /** Optional free-text reason. */
  reason?: string;
}
