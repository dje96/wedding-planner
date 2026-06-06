// ---------------------------------------------------------------------------
// Fit flags for Scout candidates in the Review tab. These mirror the ✓ / ⚠
// signals a Scout run prints in chat, but computed in the UI against the
// planner's own settings (config.ts) so the queue stays honest as settings
// change. "Unknown" is a first-class answer — a missing price or capacity is a
// neutral gap, never a silent pass/fail.
// ---------------------------------------------------------------------------

import type { Item } from "../types";
import { estimatedCost } from "./budget";
import { BUDGET, GUEST_ESTIMATE } from "../config";
import { targetDateMatch } from "./dates";

export type FitLevel = "ok" | "warn" | "unknown";

export interface Flag {
  level: FitLevel;
  label: string;
}

/** Estimated cost vs. the whole budget. A candidate's own cost alone blowing
 *  the budget is the only hard warn; otherwise it's a fit (suppliers add up
 *  later, in the scenario rollup). */
export function budgetFlag(item: Item): Flag {
  if (item.price?.amount == null) return { level: "unknown", label: "price unknown" };
  return estimatedCost(item) > BUDGET
    ? { level: "warn", label: "over budget" }
    : { level: "ok", label: "within budget" };
}

/** Capacity vs. the guest estimate. */
export function capacityFlag(item: Item): Flag {
  const max = item.capacity?.max ?? item.capacity?.seated;
  if (max == null) return { level: "unknown", label: "capacity unknown" };
  return max < GUEST_ESTIMATE
    ? { level: "warn", label: `holds ${max} (< ${GUEST_ESTIMATE})` }
    : { level: "ok", label: `holds ${max}` };
}

/** Target-date fit. Web scouting rarely sees a live calendar, so most
 *  candidates land here as "unverified" until ingestion checks the calendar. */
export function datesFlag(item: Item): Flag {
  switch (targetDateMatch(item)) {
    case "available":
      return { level: "ok", label: "open on a target date" };
    case "conflict":
      return { level: "warn", label: "target dates booked" };
    default:
      return { level: "unknown", label: "dates unverified" };
  }
}

export function scoutFlags(item: Item): Flag[] {
  return [budgetFlag(item), capacityFlag(item), datesFlag(item)];
}
