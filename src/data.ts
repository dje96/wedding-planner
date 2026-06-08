import {
  CATEGORIES,
  emptyPreferences,
  type Category,
  type DismissedEntry,
  type Item,
  type Preferences,
} from "./types";
import { supabase } from "./lib/supabase";
import type { Json } from "./database.types";

// ---------------------------------------------------------------------------
// The data layer. The "database" is now a Supabase Postgres project (see
// src/lib/supabase.ts and CLAUDE.md), not the local data/*.json files.
//
// Everything is loaded once at app bootstrap (main.tsx awaits `loadData()`),
// then read synchronously through the same accessors the rest of the app has
// always used (`ALL_ITEMS`, `VENUES`, `getItem`, …). The exported arrays/objects
// are LIVE: load and the mutation helpers refill them in place, so a reference
// captured at import time stays valid and a remounting page reads fresh data.
//
// The `items` table stores the full `Item` losslessly in a `data` jsonb column,
// with `type` / `collection` / `venue_id` promoted to real columns for indexing
// and the supplier→venue foreign key. Two collections share the table:
//   collection = 'option' → tracked options (the dashboard's subject)
//   collection = 'review' → Scout candidates awaiting triage (Review tab)
// ---------------------------------------------------------------------------

// Live, in-place stores. Never reassigned — refilled by `fill*` helpers so that
// modules importing these bindings always see the current data.
export const ALL_ITEMS: Item[] = [];
/** Scout candidates awaiting triage in the Review tab (not tracked options). */
export const REVIEW_ITEMS: Item[] = [];
/** Candidates Scout has dismissed — kept so future runs skip them. */
export const DISMISSED: DismissedEntry[] = [];
/** Venues, derived from ALL_ITEMS. */
export const VENUES: Item[] = [];
/** Per-category price limits & vibe context (Preferences tab). */
export const PREFERENCES: Preferences = emptyPreferences();

type ItemRow = {
  id: string;
  type: string;
  collection: string;
  venue_id: string | null;
  name: string;
  data: unknown;
};

const byName = (a: Item, b: Item) => a.name.localeCompare(b.name);

/** A Postgres `items` row → the `Item` the app consumes. The jsonb `data` is the
 *  full item; `venue_id` (kept in sync by the FK) wins for supplier links. */
function rowToItem(row: ItemRow): Item {
  const data = (row.data ?? {}) as Item;
  const item: Item = { ...data, id: row.id, type: row.type as Category, name: row.name };
  if (row.type !== "venue") item.venueId = row.venue_id ?? null;
  return item;
}

/** An `Item` → the row we persist. The full item lives in `data`; a few fields
 *  are mirrored into columns for indexing and the supplier→venue foreign key. */
function itemToRow(item: Item, collection: "option" | "review") {
  return {
    id: item.id,
    type: item.type,
    collection,
    venue_id: item.type !== "venue" ? (item.venueId ?? null) : null,
    name: item.name,
    data: item as unknown as Json,
  };
}

/** Replace the contents of a live array in place (keeps the exported binding). */
function refill<T>(target: T[], next: T[]): void {
  target.length = 0;
  target.push(...next);
}

function recomputeVenues(): void {
  refill(VENUES, ALL_ITEMS.filter((i) => i.type === "venue"));
}

/** Fetch everything from Supabase and populate the live stores. Call once at
 *  bootstrap; rerun any time to fully resync. Throws on a connection failure so
 *  the bootstrap can show a clear message. */
export async function loadData(): Promise<void> {
  const [items, prefs, dismissed] = await Promise.all([
    supabase.from("items").select("id, type, collection, venue_id, name, data"),
    supabase.from("preferences").select("category, price_limit, context"),
    supabase.from("dismissed_candidates").select("id, name, url, category, dismissed_at, reason"),
  ]);

  if (items.error) throw items.error;
  if (prefs.error) throw prefs.error;
  if (dismissed.error) throw dismissed.error;

  const options: Item[] = [];
  const review: Item[] = [];
  for (const row of (items.data ?? []) as ItemRow[]) {
    const item = rowToItem(row);
    (row.collection === "review" ? review : options).push(item);
  }
  refill(ALL_ITEMS, options.sort(byName));
  refill(REVIEW_ITEMS, review.sort(byName));
  recomputeVenues();

  const nextPrefs = emptyPreferences();
  for (const row of prefs.data ?? []) {
    const cat = row.category as Category;
    if (!CATEGORIES.includes(cat)) continue;
    const entry: Preferences[Category] = {};
    if (row.price_limit != null) entry.priceLimit = Number(row.price_limit);
    if (row.context) entry.context = row.context;
    nextPrefs[cat] = entry;
  }
  for (const cat of CATEGORIES) PREFERENCES[cat] = nextPrefs[cat];

  refill(
    DISMISSED,
    (dismissed.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      url: d.url,
      category: d.category as Category,
      dismissedAt: d.dismissed_at ?? undefined,
      reason: d.reason ?? undefined,
    })),
  );
}

// -- Synchronous accessors (read the live stores) ---------------------------

export function itemsByCategory(category: Category): Item[] {
  return ALL_ITEMS.filter((i) => i.type === category);
}

export function getItem(id: string): Item | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}

/** A Scout candidate awaiting triage (Review queue), looked up by id. */
export function getReviewItem(id: string): Item | undefined {
  return REVIEW_ITEMS.find((i) => i.id === id);
}

/** Non-venue items linked to a given venue. */
export function linkedItems(venueId: string): Item[] {
  return ALL_ITEMS.filter((i) => i.type !== "venue" && i.venueId === venueId);
}

/** Non-venue items not yet tied to any venue. */
export function unassignedItems(): Item[] {
  return ALL_ITEMS.filter((i) => i.type !== "venue" && !i.venueId);
}

export function countsByCategory(): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const item of ALL_ITEMS) counts[item.type] += 1;
  return counts;
}

// -- Mutations (write Supabase, then update the live stores) -----------------

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Promote a Scout candidate from the Review queue into the tracked options:
 * flip its collection to 'option', drop the scout-only fields, default the
 * status and stamp `addedAt`. (Photos are still pulled locally on a follow-up
 * pass — see CLAUDE.md.)
 */
export async function promoteCandidate(item: Item): Promise<void> {
  const { scoutNote, scoutedAt, ...rest } = item;
  void scoutNote;
  void scoutedAt;
  const promoted: Item = { ...rest, status: rest.status ?? "considering", addedAt: today() };
  const { error } = await supabase
    .from("items")
    .update({ ...itemToRow(promoted, "option") })
    .eq("id", item.id);
  if (error) throw error;

  refill(REVIEW_ITEMS, REVIEW_ITEMS.filter((i) => i.id !== item.id));
  refill(ALL_ITEMS, [...ALL_ITEMS.filter((i) => i.id !== item.id), promoted].sort(byName));
  recomputeVenues();
}

/** Dismiss a Scout candidate: log it to the ledger (so future scouts skip it)
 *  and remove it from the Review queue. */
export async function dismissCandidate(item: Item): Promise<void> {
  const already = DISMISSED.some((d) => d.id === item.id || (item.url && d.url === item.url));
  if (!already) {
    const { error } = await supabase.from("dismissed_candidates").insert({
      id: item.id,
      name: item.name ?? item.id,
      url: item.url ?? "",
      category: item.type,
      dismissed_at: today(),
    });
    if (error) throw error;
  }
  const { error: delErr } = await supabase.from("items").delete().eq("id", item.id);
  if (delErr) throw delErr;

  refill(REVIEW_ITEMS, REVIEW_ITEMS.filter((i) => i.id !== item.id));
  if (!already) {
    refill(DISMISSED, [
      ...DISMISSED,
      {
        id: item.id,
        name: item.name ?? item.id,
        url: item.url ?? "",
        category: item.type,
        dismissedAt: today(),
      },
    ]);
  }
}

/**
 * Permanently remove a tracked option, including its photos in Supabase Storage.
 * Deleting a venue first unlinks its paired suppliers (venue_id → null, moving
 * them to "Not yet paired") rather than deleting them. Returns the unlinked ids.
 */
export async function deleteOption(id: string): Promise<{ unlinked: string[] }> {
  const target = getItem(id);
  let unlinked: string[] = [];

  if (target?.type === "venue") {
    const suppliers = linkedItems(id);
    unlinked = suppliers.map((s) => s.id);
    for (const supplier of suppliers) {
      const detached: Item = { ...supplier, venueId: null };
      const { error } = await supabase
        .from("items")
        .update({ venue_id: null, data: detached as unknown as Json })
        .eq("id", supplier.id);
      if (error) throw error;
    }
  }

  // Clear the option's photo folder from Storage (best-effort; a failure here
  // shouldn't block the delete).
  const { data: files } = await supabase.storage.from("photos").list(id);
  if (files?.length) {
    await supabase.storage.from("photos").remove(files.map((f) => `${id}/${f.name}`));
  }

  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;

  const unlinkedSet = new Set(unlinked);
  refill(
    ALL_ITEMS,
    ALL_ITEMS.filter((i) => i.id !== id).map((i) =>
      unlinkedSet.has(i.id) ? { ...i, venueId: null } : i,
    ),
  );
  recomputeVenues();
  return { unlinked };
}

/** Overwrite the per-category preferences (Preferences tab). */
export async function savePreferences(prefs: Preferences): Promise<void> {
  const rows = CATEGORIES.map((cat) => ({
    category: cat,
    price_limit: prefs[cat]?.priceLimit ?? null,
    context: prefs[cat]?.context?.trim() || null,
  }));
  const { error } = await supabase.from("preferences").upsert(rows, { onConflict: "category" });
  if (error) throw error;
  for (const cat of CATEGORIES) {
    const entry: Preferences[Category] = {};
    if (prefs[cat]?.priceLimit != null) entry.priceLimit = prefs[cat].priceLimit;
    if (prefs[cat]?.context?.trim()) entry.context = prefs[cat].context!.trim();
    PREFERENCES[cat] = entry;
  }
}
