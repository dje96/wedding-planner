import { linkedItems, VENUES } from "../data";
import type { Item, Price, Status } from "../types";
import {
  ASSUMED_STAY_NIGHTS,
  BUDGET,
  CURRENCY,
  GUEST_ESTIMATE,
  WEEKEND_RENTAL_NIGHTS,
} from "../config";

export { GUEST_ESTIMATE };

/** Whether a venue's event type implies a multi-night rental (so the nights
 *  count is worth showing and the per-night/weekly rate gets multiplied). */
export function isMultiNight(item: Item): boolean {
  return item.eventType === "family_stay" || item.eventType === "weekend_rental";
}

/** Nights to assume for a venue: explicit `stayNights`, else the beachfront
 *  default for a family stay, the Fri–Sun default for a weekend rental, else 1
 *  (a day-of event has no multi-night cost). */
export function stayNights(item: Item): number {
  if (item.stayNights != null) return item.stayNights;
  if (item.eventType === "family_stay") return ASSUMED_STAY_NIGHTS;
  if (item.eventType === "weekend_rental") return WEEKEND_RENTAL_NIGHTS;
  return 1;
}

/**
 * Best-effort single cost for an item, normalised to a scenario contribution.
 * - per_person → amount × guests
 * - per_night  → amount × nights (family-stay duration)
 * - per_week   → amount × ceil(nights / 7)
 * - per_day    → amount × nights
 * - everything else (total / from / per_hour) → amount as-is
 */
export function estimatedCost(item: Item, guests = GUEST_ESTIMATE): number {
  const price: Price | undefined = item.price;
  if (!price || price.amount == null) return 0;
  const nights = stayNights(item);
  switch (price.unit) {
    case "per_person":
      return price.amount * guests;
    case "per_night":
    case "per_day":
      return price.amount * nights;
    case "per_week":
      return price.amount * Math.max(1, Math.ceil(nights / 7));
    default:
      return price.amount;
  }
}

/** Total estimated spend for a venue plus everything linked to it. */
export function scenarioTotal(venue: Item, guests = GUEST_ESTIMATE): number {
  const linked = linkedItems(venue.id);
  return [venue, ...linked].reduce((sum, i) => sum + estimatedCost(i, guests), 0);
}

export function formatTotal(amount: number, currency = CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface BudgetStatus {
  budget: number;
  spent: number;
  remaining: number;
  pct: number; // 0–100+, capped only for the bar width by the caller
  over: boolean;
}

/** Budget status for a given scenario total (e.g. the leading venue). */
export function budgetStatus(spent: number): BudgetStatus {
  const remaining = BUDGET - spent;
  const pct = BUDGET > 0 ? (spent / BUDGET) * 100 : 0;
  return { budget: BUDGET, spent, remaining, pct, over: spent > BUDGET };
}

const STATUS_RANK: Status[] = [
  "booked",
  "shortlisted",
  "quoted",
  "contacted",
  "considering",
  "passed",
];

/** The venue you're furthest along with (booked > shortlisted > …), if any. */
export function leadingVenue(): Item | undefined {
  if (VENUES.length === 0) return undefined;
  return [...VENUES].sort(
    (a, b) =>
      STATUS_RANK.indexOf(a.status ?? "considering") -
      STATUS_RANK.indexOf(b.status ?? "considering")
  )[0];
}

/** Scenario total for the leading venue (0 if none). */
export function leadingScenarioTotal(): number {
  const lead = leadingVenue();
  return lead ? scenarioTotal(lead) : 0;
}
