import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORY_LABELS, type Item } from "../types";
import { linkedItems } from "../data";
import { devMutate, isDevServerMissing } from "../lib/devApi";

/** Permanently remove a tracked option (any category). Two-step confirm guards
 *  against an accidental click; on success we leave the now-dead detail route
 *  and HMR reloads the dashboard from the freshly-shrunk `data/` directory. */
export function DeleteOption({ item }: { item: Item }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noun = CATEGORY_LABELS[item.type].singular.toLowerCase();
  const linkedCount = item.type === "venue" ? linkedItems(item.id).length : 0;
  const hasPhotos = (item.photos?.length ?? 0) > 0;

  async function doDelete() {
    setBusy(true);
    setError(null);
    try {
      await devMutate("/__option/delete", { id: item.id });
      navigate(item.type === "venue" ? "/" : `/category/${item.type}`, { replace: true });
    } catch (err) {
      setBusy(false);
      setError(
        isDevServerMissing(err)
          ? "Deleting needs the dev server — run `npm run dev` (it removes the data file, which the static build can't do)."
          : `Couldn't delete: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return (
    <div className="danger-zone">
      {error && <div className="review-banner">{error}</div>}

      {!confirming ? (
        <button className="btn-text-danger" onClick={() => setConfirming(true)}>
          Delete this {noun}
        </button>
      ) : (
        <div className="delete-confirm">
          <p className="delete-warn">
            Permanently delete <strong>{item.name}</strong>? This removes its data file
            {hasPhotos ? " and downloaded photos" : ""}.
            {linkedCount > 0 && (
              <>
                {" "}
                {linkedCount} paired {linkedCount === 1 ? "supplier" : "suppliers"} will be unlinked
                (not deleted).
              </>
            )}
          </p>
          <div className="review-actions">
            <button className="btn btn-danger" disabled={busy} onClick={doDelete}>
              {busy ? "Deleting…" : "Delete permanently"}
            </button>
            <button
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
