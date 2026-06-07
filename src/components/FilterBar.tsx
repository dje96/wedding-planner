import { useMemo } from "react";
import type { Item } from "../types";
import {
  buildFacets,
  hasActiveFilters,
  toggleFilter,
  EMPTY_FILTER,
  type FilterState,
  type Facet,
} from "../lib/filters";

interface Props {
  /** The full (unfiltered) set for this page — facets are derived from it. */
  items: Item[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  /** How many items match the current filters, for the result count. */
  resultCount: number;
  /** Noun for the count, e.g. "venue" / "option" / "candidate". */
  noun?: string;
}

/** A faceted filter bar (State · Type · Tags) shared by the Review and category
 *  pages. A facet group is only rendered when it has at least two distinct
 *  values — filtering by a lone value would do nothing. If no facet qualifies,
 *  the bar renders nothing. */
export function FilterBar({ items, value, onChange, resultCount, noun = "option" }: Props) {
  const facets = useMemo(() => buildFacets(items), [items]);

  const groups = (
    [
      { key: "states", label: "State", facets: facets.states },
      { key: "types", label: "Type", facets: facets.types },
      { key: "tags", label: "Tags", facets: facets.tags },
    ] as Array<{ key: keyof FilterState; label: string; facets: Facet[] }>
  ).filter((g) => g.facets.length >= 2);

  if (groups.length === 0) return null;

  const active = hasActiveFilters(value);
  const total = items.length;

  return (
    <div className="filter-bar reveal">
      <div className="filter-bar-head">
        <span className="filter-bar-title">Filter</span>
        <span className="filter-bar-count">
          {active ? (
            <>
              {resultCount} of {total} {noun}
              {total === 1 ? "" : "s"}
            </>
          ) : (
            <>
              {total} {noun}
              {total === 1 ? "" : "s"}
            </>
          )}
        </span>
        {active && (
          <button className="filter-clear" onClick={() => onChange(EMPTY_FILTER)}>
            Clear all
          </button>
        )}
      </div>

      <div className="filter-groups">
        {groups.map((g) => (
          <div key={g.key} className="filter-group">
            <span className="filter-group-label">{g.label}</span>
            <div className="filter-chips">
              {g.facets.map((f) => {
                const on = (value[g.key] as string[]).includes(f.value);
                return (
                  <button
                    key={f.value}
                    className={`filter-chip ${on ? "active" : ""}`}
                    aria-pressed={on}
                    onClick={() => onChange(toggleFilter(value, g.key, f.value))}
                  >
                    {f.label}
                    <span className="filter-chip-count">{f.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
