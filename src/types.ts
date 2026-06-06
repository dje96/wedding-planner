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
  unit?: "total" | "per_person" | "per_hour" | "per_day" | "from";
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

  status?: Status;
  /** Your own running notes — the one field expected to be hand-edited. */
  notes?: string;
  tags?: string[];

  /** Category-specific extras that don't fit the shared shape, e.g.
   *  { "hours": "8", "secondShooter": "yes" } for a photographer. */
  attributes?: Record<string, string>;

  /** ISO timestamp set when the item was ingested. */
  addedAt?: string;
}
