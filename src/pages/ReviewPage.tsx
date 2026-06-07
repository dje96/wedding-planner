import { useState } from "react";
import { REVIEW_ITEMS, DISMISSED } from "../data";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, type Item } from "../types";
import { formatPrice, formatLocation } from "../lib/format";
import { scoutFlags, type FitLevel } from "../lib/scout";
import { devMutate, isDevServerMissing } from "../lib/devApi";

const FLAG_MARK: Record<FitLevel, string> = { ok: "✓", warn: "⚠", unknown: "–" };

type ActionState =
  | { kind: "idle" }
  | { kind: "busy"; id: string; action: "add" | "dismiss" }
  | { kind: "error"; message: string };

export function ReviewPage() {
  // Optimistic local copy: removing a card on success keeps the page snappy.
  // Writing the file also triggers Vite HMR, which reloads with fresh data.
  const [items, setItems] = useState<Item[]>(REVIEW_ITEMS);
  const [state, setState] = useState<ActionState>({ kind: "idle" });

  async function triage(item: Item, action: "add" | "dismiss") {
    setState({ kind: "busy", id: item.id, action });
    try {
      await devMutate(`/__review/${action}`, { id: item.id });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setState({ kind: "idle" });
    } catch (err) {
      setState({
        kind: "error",
        message: isDevServerMissing(err)
          ? "Add / Dismiss needs the dev server — run `npm run dev` (the buttons write data files, which the static build can't do)."
          : `Couldn't ${action} this candidate: ${err instanceof Error ? err.message : String(err)}`,
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
        <div className="card-grid">
          {items.map((item, i) => {
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
                    {scoutFlags(item).map((f, j) => (
                      <span key={j} className={`flag flag-${f.level}`}>
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
  );
}
