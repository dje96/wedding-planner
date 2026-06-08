import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Item } from "../types";
import { promoteCandidate, dismissCandidate } from "../data";

/** Triage actions for a Scout candidate shown on its detail page — the same
 *  Add / Dismiss moves as the Review card, so a candidate can be acted on from
 *  the full detail view. Add promotes it into tracked options (and lands on its
 *  now-tracked detail page); Dismiss logs it to the ledger and returns to Review. */
export function ReviewActions({ item }: { item: Item }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<null | "add" | "dismiss">(null);
  const [error, setError] = useState<string | null>(null);

  async function triage(action: "add" | "dismiss") {
    setBusy(action);
    setError(null);
    try {
      if (action === "add") {
        await promoteCandidate(item);
        navigate(`/item/${item.id}`, { replace: true });
      } else {
        await dismissCandidate(item);
        navigate("/review", { replace: true });
      }
    } catch (err) {
      setBusy(null);
      setError(`Couldn't ${action} this candidate: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="danger-zone">
      {error && <div className="review-banner">{error}</div>}
      <div className="review-actions">
        <button className="btn btn-primary" disabled={!!busy} onClick={() => triage("add")}>
          {busy === "add" ? "Adding…" : "Add to options"}
        </button>
        <button className="btn btn-ghost" disabled={!!busy} onClick={() => triage("dismiss")}>
          {busy === "dismiss" ? "Dismissing…" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
