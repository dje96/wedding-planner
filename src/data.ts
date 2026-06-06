import { CATEGORIES, type Category, type Item } from "./types";

// Eagerly load every option file under /data. Vite inlines these at build time
// and re-runs on hot reload, so dropping a new JSON file into data/<category>/
// makes it appear in the dashboard with no code change.
const modules = import.meta.glob<{ default: Item }>("/data/**/*.json", {
  eager: true,
});

function loadItems(): Item[] {
  const items: Item[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    const item = mod.default;
    if (!item || !item.id || !item.type) {
      console.warn(`Skipping malformed data file: ${path}`);
      continue;
    }
    items.push(item);
  }
  // Stable, friendly ordering: by name within each load.
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export const ALL_ITEMS: Item[] = loadItems();

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
