import { linkedItems } from "../data";
import type { Item, Price } from "../types";

// A rough guest count used to roll per-person prices up into a scenario total.
// Adjust to your real headcount — it only affects the estimate, not stored data.
export const GUEST_ESTIMATE = 120;

/** Best-effort single number for an item, normalised to a scenario contribution. */
export function estimatedCost(price?: Price, guests = GUEST_ESTIMATE): number {
  if (!price || price.amount == null) return 0;
  return price.unit === "per_person" ? price.amount * guests : price.amount;
}

/** Total estimated spend for a venue plus everything linked to it. */
export function scenarioTotal(venue: Item, guests = GUEST_ESTIMATE): number {
  const linked = linkedItems(venue.id);
  return [venue, ...linked].reduce((sum, i) => sum + estimatedCost(i.price, guests), 0);
}

export function formatTotal(amount: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
