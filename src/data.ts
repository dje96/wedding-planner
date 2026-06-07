import {
  CATEGORIES,
  emptyPreferences,
  type Category,
  type DismissedEntry,
  type Item,
  type Preferences,
} from "./types";

// Eagerly load every file under /data. Vite inlines these at build time and
// re-runs on hot reload, so dropping a new JSON file in makes it appear with no
// code change. Three kinds of file live here, told apart by path:
//   data/<category>/*.json  → tracked options (the dashboard's subject)
//   data/review/*.json      → Scout candidates awaiting triage (Review tab)
//   data/dismissed.json     → the ledger of candidates Scout should skip
//   data/preferences.json   → per-category price limits & vibe (Preferences tab)
const modules = import.meta.glob<{ default: unknown }>("/data/**/*.json", {
  eager: true,
});

const REVIEW_PREFIX = "/data/review/";
const DISMISSED_PATH = "/data/dismissed.json";
const PREFERENCES_PATH = "/data/preferences.json";

interface Loaded {
  options: Item[];
  review: Item[];
  dismissed: DismissedEntry[];
  preferences: Preferences;
}

function loadAll(): Loaded {
  const options: Item[] = [];
  const review: Item[] = [];
  let dismissed: DismissedEntry[] = [];
  const preferences = emptyPreferences();

  for (const [path, mod] of Object.entries(modules)) {
    if (path === DISMISSED_PATH) {
      const ledger = mod.default as { dismissed?: DismissedEntry[] } | undefined;
      dismissed = ledger?.dismissed ?? [];
      continue;
    }
    if (path === PREFERENCES_PATH) {
      const stored = (mod.default ?? {}) as Partial<Preferences>;
      // Merge onto a blank map so every category is always present, even if the
      // file is missing one. Ignore any stray keys that aren't real categories.
      for (const cat of CATEGORIES) {
        const entry = stored[cat];
        if (entry && typeof entry === "object") preferences[cat] = { ...entry };
      }
      continue;
    }
    const item = mod.default as Item | undefined;
    if (!item || !item.id || !item.type) {
      console.warn(`Skipping malformed data file: ${path}`);
      continue;
    }
    if (path.startsWith(REVIEW_PREFIX)) review.push(item);
    else options.push(item);
  }

  // Stable, friendly ordering: by name within each load.
  const byName = (a: Item, b: Item) => a.name.localeCompare(b.name);
  return {
    options: options.sort(byName),
    review: review.sort(byName),
    dismissed,
    preferences,
  };
}

const loaded = loadAll();

export const ALL_ITEMS: Item[] = loaded.options;

/** Scout candidates awaiting triage in the Review tab (not tracked options). */
export const REVIEW_ITEMS: Item[] = loaded.review;

/** Candidates Scout has dismissed — kept so future runs skip them. */
export const DISMISSED: DismissedEntry[] = loaded.dismissed;

/** Per-category price limits & vibe context (Preferences tab → data/preferences.json). */
export const PREFERENCES: Preferences = loaded.preferences;

export function itemsByCategory(category: Category): Item[] {
  return ALL_ITEMS.filter((i) => i.type === category);
}

export const VENUES: Item[] = itemsByCategory("venue");

export function getItem(id: string): Item | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
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
