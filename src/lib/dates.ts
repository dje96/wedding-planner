import type { Item } from "../types";
import { TARGET_DATES } from "../config";

export type DateMatch = "available" | "conflict" | "unknown";

/**
 * How a venue's stated availability lines up with the target dates:
 * - `available`: at least one open date matches a target date.
 * - `conflict`: the venue lists open dates, but none match the targets.
 * - `unknown`: no open-date data to judge by.
 */
export function targetDateMatch(item: Item): DateMatch {
  const open = item.availability?.openDates;
  if (!open || open.length === 0) return "unknown";
  return open.some((d) => TARGET_DATES.includes(d)) ? "available" : "conflict";
}

/** A short human label for a target date. */
export function formatTargetDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
