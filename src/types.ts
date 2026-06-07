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
 * - `day_of`: a more typical single-day celebration.
 */
export type EventType = "family_stay" | "day_of";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  family_stay: "Family stay",
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
  /** Venues only, for `family_stay`: number of nights rented. Drives the rental
   *  cost when the price is a weekly or per-night rate. */
  stayNights?: number;

  status?: Status;
  /** Your own running notes — the one field expected to be hand-edited. */
  notes?: string;
  tags?: string[];

  /** Category-specific extras that don't fit the shared shape, e.g.
   *  { "hours": "8", "secondShooter": "yes" } for a photographer. */
  attributes?: Record<string, string>;

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
