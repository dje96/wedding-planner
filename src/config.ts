// ---------------------------------------------------------------------------
// Planner settings. These are the few things you set by hand (everything else
// comes from pasted links). Edit freely — they only affect estimates and
// highlighting, never the stored option data.
// ---------------------------------------------------------------------------

/** Total wedding budget, in CURRENCY. */
export const BUDGET = 30000;

/** Currency used for budget rollups and totals. */
export const CURRENCY = "USD";

/** Rough guest count, used to roll per-person prices (e.g. catering) into totals. */
export const GUEST_ESTIMATE = 60;

/** Default nights assumed for a beachfront / family-stay venue when not stated. */
export const ASSUMED_STAY_NIGHTS = 7;

/** Default nights for a weekend-rental venue (Fri–Sun) when not stated. */
export const WEEKEND_RENTAL_NIGHTS = 2;

/**
 * Target wedding dates: a Saturday towards the end of August or early October
 * 2026. Venues with availability on any of these get a highlight; the window is
 * shown across the dashboard.
 */
export const TARGET_DATES = ["2026-08-22", "2026-08-29", "2026-10-03", "2026-10-10"];

export const TARGET_DATE_LABEL = "A Saturday — late Aug or early Oct 2026";
