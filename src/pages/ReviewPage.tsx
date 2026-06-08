import { useState } from "react";
import { REVIEW_ITEMS, DISMISSED, promoteCandidate, dismissCandidate } from "../data";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, type Item } from "../types";
import { formatPrice, formatLocation } from "../lib/format";
import { scoutFlags, caveatFlags, type FitLevel } from "../lib/scout";
import { FilterBar } from "../components/FilterBar";
import { applyFilters, EMPTY_FILTER, hasActiveFilters } from "../lib/filters";

const FLAG_MARK: Record<FitLevel, string> = { ok: "✓", warn: "⚠", unknown: "?" };

type ActionState =
  | { kind: "idle" }
  | { kind: "busy"; id: string; action: "add" | "dismiss" }
  | { kind: "error"; message: string };

export function ReviewPage() {
  // Optimistic local copy: removing a card on success keeps the page snappy.
  // The store (src/data.ts) is updated in step, so other pages read fresh data.
  const [items, setItems] = useState<Item[]>(() => [...REVIEW_ITEMS]);
  const [state, setState] = useState<ActionState>({ kind: "idle" });
  const [filters, setFilters] = useState(EMPTY_FILTER);
  const filtered = applyFilters(items, filters);

  async function triage(item: Item, action: "add" | "dismiss") {
    setState({ kind: "busy", id: item.id, action });
    try {
      if (action === "add") await promoteCandidate(item);
      else await dismissCandidate(item);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setState({ kind: "idle" });
    } catch (err) {
      setState({
        kind: "error",
        message: `Couldn't ${action} this candidate: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return (
    <>
      <div className="page-head reveal">
        <div className="eyebrow">
          🔎 {items.length} {items.length === 1 ? "candidate" : "candidates"} to review
        </div>
        <h1>Review</h1>
        <p className="lede">
          Candidates Scout found and queued. <strong>Add</strong> moves one into your tracked
          options (then ask me to pull photos and check the real calendar); <strong>Dismiss</strong>{" "}
          drops it and stops future scouts from resurfacing it.
        </p>
      </div>

      {state.kind === "error" && <div className="review-banner">{state.message}</div>}

      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-mark">🔎</div>
          Nothing to review. Run <code>/scout</code> to find candidates.
          {DISMISSED.length > 0 && (
            <div className="review-dismissed-note">
              {DISMISSED.length} previously dismissed — Scout skips these.
            </div>
          )}
        </div>
      ) : (
        <>
          <FilterBar
            items={items}
            value={filters}
            onChange={setFilters}
            resultCount={filtered.length}
            noun="candidate"
          />
          {filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-mark">🔎</div>
              No candidates match these filters.
              {hasActiveFilters(filters) && (
                <div style={{ marginTop: "0.75rem" }}>
                  <button className="btn-link" onClick={() => setFilters(EMPTY_FILTER)}>
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card-grid">
              {filtered.map((item, i) => {
            const photo = item.photos?.[0];
            const loc = formatLocation(item);
            const busy = state.kind === "busy" && state.id === item.id;
            return (
              <article
                key={item.id}
                className="card review-card reveal"
                style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
              >
                <div className="card-photo">
                  {photo ? (
                    <img src={photo} alt={item.name} loading="lazy" />
                  ) : (
                    <div className="no-photo">{CATEGORY_LABELS[item.type].icon}</div>
                  )}
                </div>
                <div className="card-body">
                  <h3>{item.name}</h3>
                  <div className="card-loc">
                    {CATEGORY_LABELS[item.type].singular}
                    {item.eventType ? ` · ${EVENT_TYPE_LABELS[item.eventType]}` : ""}
                    {loc !== "—" ? ` · ${loc}` : ""}
                  </div>

                  <div className="review-flags">
                    {[...scoutFlags(item), ...caveatFlags(item)].map((f, j) => (
                      <span
                        key={j}
                        className={`flag flag-${f.level}`}
                        title={f.detail ?? undefined}
                      >
                        {FLAG_MARK[f.level]} {f.label}
                      </span>
                    ))}
                  </div>

                  {item.scoutNote && <p className="card-desc">{item.scoutNote}</p>}

                  <div className="review-foot">
                    <span className="card-price">{formatPrice(item.price)}</span>
                    <a
                      className="btn-link"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View source ↗
                    </a>
                  </div>

                  <div className="review-actions">
                    <button
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => triage(item, "add")}
                    >
                      {busy && state.action === "add" ? "Adding…" : "Add"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      disabled={busy}
                      onClick={() => triage(item, "dismiss")}
                    >
                      {busy && state.action === "dismiss" ? "Dismissing…" : "Dismiss"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
            </div>
          )}
        </>
      )}
    </>
  );
}
