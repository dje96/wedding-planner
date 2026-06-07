import { useMemo, useState } from "react";
import { PREFERENCES } from "../data";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Preferences } from "../types";
import { BUDGET, CURRENCY } from "../config";
import { formatTotal } from "../lib/budget";
import { devMutate, isDevServerMissing } from "../lib/devApi";

type SaveState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

/** Per-category steer Duncan hand-sets: a spend ceiling and a vibe note. Both
 *  are read by `/scout` so research matches his budget and taste. The dashboard
 *  is otherwise a static read of `data/`, so saving goes through the dev-only
 *  `/__preferences/save` endpoint (works under `npm run dev`). */
export function PreferencesPage() {
  // Editable working copy, seeded from the loaded file. A successful save also
  // writes the file → HMR reload reseeds this with the persisted values.
  const [prefs, setPrefs] = useState<Preferences>(() =>
    structuredClone(PREFERENCES),
  );
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  const dirty = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(PREFERENCES),
    [prefs],
  );

  function update(cat: Category, patch: Partial<Preferences[Category]>) {
    setPrefs((prev) => ({ ...prev, [cat]: { ...prev[cat], ...patch } }));
    if (state.kind === "saved" || state.kind === "error") setState({ kind: "idle" });
  }

  async function save() {
    setState({ kind: "busy" });
    try {
      await devMutate("/__preferences/save", { preferences: prefs });
      setState({ kind: "saved" });
    } catch (err) {
      setState({
        kind: "error",
        message: isDevServerMissing(err)
          ? "Saving needs the dev server — run `npm run dev` (it writes data/preferences.json, which the static build can't do)."
          : `Couldn't save: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return (
    <>
      <div className="page-head reveal">
        <div className="eyebrow">⚙ Planning preferences</div>
        <h1>Preferences</h1>
        <p className="lede">
          Set a price limit and describe the vibe you're after for each area. The vibe notes are
          handed to <code>/scout</code> when it researches new options, so the candidates it queues
          match your taste and budget. Overall budget is{" "}
          <strong>{formatTotal(BUDGET)}</strong> (set in <code>src/config.ts</code>).
        </p>
      </div>

      {state.kind === "error" && <div className="review-banner">{state.message}</div>}

      <div className="prefs-grid">
        {CATEGORIES.map((cat, i) => {
          const entry = prefs[cat];
          const label = CATEGORY_LABELS[cat];
          return (
            <section
              key={cat}
              className="card prefs-card reveal"
              style={{ animationDelay: `${Math.min(i * 60, 240)}ms` }}
            >
              <header className="prefs-card-head">
                <span className="prefs-icon">{label.icon}</span>
                <h3>{label.plural}</h3>
              </header>

              <label className="prefs-field">
                <span className="prefs-label">Price limit</span>
                <div className="prefs-money">
                  <span className="prefs-money-cur">{CURRENCY}</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    inputMode="numeric"
                    placeholder="No limit"
                    value={entry.priceLimit ?? ""}
                    onChange={(e) =>
                      update(cat, {
                        priceLimit:
                          e.target.value === "" ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <span className="prefs-hint">
                  A soft ceiling for {label.plural.toLowerCase()} — Scout flags options above it.
                </span>
              </label>

              <label className="prefs-field">
                <span className="prefs-label">Vibe &amp; context</span>
                <textarea
                  rows={4}
                  placeholder={PLACEHOLDERS[cat]}
                  value={entry.context ?? ""}
                  onChange={(e) => update(cat, { context: e.target.value })}
                />
                <span className="prefs-hint">Free text — passed to Scout as search criteria.</span>
              </label>
            </section>
          );
        })}
      </div>

      <div className="prefs-actions">
        <button
          className="btn btn-primary prefs-save"
          disabled={state.kind === "busy" || !dirty}
          onClick={save}
        >
          {state.kind === "busy"
            ? "Saving…"
            : state.kind === "saved" && !dirty
              ? "Saved ✓"
              : "Save preferences"}
        </button>
        {state.kind === "saved" && !dirty && (
          <span className="prefs-saved-note">✓ Saved to data/preferences.json</span>
        )}
        {dirty && state.kind !== "busy" && (
          <span className="prefs-saved-note prefs-dirty">Unsaved changes</span>
        )}
      </div>
    </>
  );
}

const PLACEHOLDERS: Record<Category, string> = {
  venue:
    "e.g. coastal, relaxed, room for ~60, somewhere we can stay the week. Character over polish.",
  photographer:
    "e.g. documentary / candid style, not too posed. Warm, film-like tones. Full-day coverage.",
  catering:
    "e.g. seasonal sharing plates, good veggie options, relaxed family-style service.",
  decor:
    "e.g. wildflower / foraged look, lots of greenery, nothing too formal. Soft, natural palette.",
};
