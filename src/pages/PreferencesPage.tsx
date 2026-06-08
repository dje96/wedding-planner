import { useMemo, useState } from "react";
import { PREFERENCES, savePreferences } from "../data";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Preferences } from "../types";
import { BUDGET, CURRENCY } from "../config";
import { formatTotal } from "../lib/budget";

type SaveState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

/** Per-category steer Duncan hand-sets: a spend ceiling and a vibe note. Both
 *  are read by `/scout` so research matches his budget and taste. Saving writes
 *  the `preferences` table in Supabase via `savePreferences` (src/data.ts). */
export function PreferencesPage() {
  // Editable working copy, seeded from the loaded preferences.
  const [prefs, setPrefs] = useState<Preferences>(() =>
    structuredClone(PREFERENCES),
  );
  // Last-persisted snapshot, advanced on every successful save. We track this
  // locally and advance it on save (rather than diffing against the live
  // `PREFERENCES` store) so `dirty` clears immediately after a save.
  const [saved, setSaved] = useState<Preferences>(() =>
    structuredClone(PREFERENCES),
  );
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  const dirty = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(saved),
    [prefs, saved],
  );

  function update(cat: Category, patch: Partial<Preferences[Category]>) {
    setPrefs((prev) => ({ ...prev, [cat]: { ...prev[cat], ...patch } }));
    if (state.kind === "saved" || state.kind === "error") setState({ kind: "idle" });
  }

  async function save() {
    setState({ kind: "busy" });
    try {
      await savePreferences(prefs);
      // Advance the persisted snapshot so `dirty` clears immediately.
      setSaved(structuredClone(prefs));
      setState({ kind: "saved" });
    } catch (err) {
      setState({
        kind: "error",
        message: `Couldn't save: ${err instanceof Error ? err.message : String(err)}`,
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
          <span className="prefs-saved-note">✓ Saved</span>
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
