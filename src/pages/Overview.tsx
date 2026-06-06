import { Link } from "react-router-dom";
import { ALL_ITEMS, VENUES, linkedItems, unassignedItems } from "../data";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, type Item } from "../types";
import { formatPrice, formatCapacity, formatLocation, formatRating } from "../lib/format";
import {
  scenarioTotal,
  formatTotal,
  budgetStatus,
  leadingScenarioTotal,
  leadingVenue,
  stayNights,
} from "../lib/budget";
import { targetDateMatch } from "../lib/dates";
import { TARGET_DATE_LABEL } from "../config";
import { StatusPill } from "../components/StatusPill";

const DATE_MATCH: Record<ReturnType<typeof targetDateMatch>, { label: string; color: string }> = {
  available: { label: "✓ dates open", color: "var(--sage)" },
  conflict: { label: "⚠ dates clash", color: "var(--st-passed)" },
  unknown: { label: "check 2026", color: "var(--ink-faint)" },
};

function VenueDossier({ venue, index }: { venue: Item; index: number }) {
  const linked = linkedItems(venue.id);
  const total = scenarioTotal(venue);
  const match = DATE_MATCH[targetDateMatch(venue)];
  return (
    <article className="dossier reveal" style={{ animationDelay: `${index * 90}ms` }}>
      <div className="dossier-top">
        <Link to={`/item/${venue.id}`} className="dossier-photo">
          {venue.photos?.[0] && <img src={venue.photos[0]} alt={venue.name} loading="lazy" />}
          <span className="price-tag tnum">{formatPrice(venue.price)}</span>
        </Link>
        <div className="dossier-body">
          <div className="dossier-titlerow">
            <div>
              <Link to={`/item/${venue.id}`}>
                <h3>{venue.name}</h3>
              </Link>
              <div className="loc">{formatLocation(venue)}</div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {venue.eventType && (
                <span className="chip">
                  {EVENT_TYPE_LABELS[venue.eventType]}
                  {venue.eventType === "family_stay" ? ` · ${stayNights(venue)}n` : ""}
                </span>
              )}
              <StatusPill status={venue.status} />
            </div>
          </div>
          {venue.description && <p className="desc">{venue.description}</p>}
          <div className="spec-row">
            <div className="spec">
              <span className="spec-k">Capacity</span>
              <span className="spec-v">{formatCapacity(venue)}</span>
            </div>
            <div className="spec">
              <span className="spec-k">Rating</span>
              <span className="spec-v">{formatRating(venue)}</span>
            </div>
            <div className="spec">
              <span className="spec-k">Your dates</span>
              <span className="spec-v" style={{ color: match.color }}>
                {match.label}
              </span>
            </div>
            <div className="spec">
              <span className="spec-k">Est. scenario total</span>
              <span className="spec-v" style={{ color: "var(--claret)" }}>
                {formatTotal(total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="roster">
        <div className="roster-label">
          Paired suppliers · {linked.length} linked to this venue
        </div>
        {linked.length === 0 ? (
          <p className="roster-empty">
            Nothing linked yet — paste a photographer, caterer or decor link and I'll attach it
            here.
          </p>
        ) : (
          <div className="roster-grid">
            {linked.map((item) => (
              <Link key={item.id} to={`/item/${item.id}`} className="roster-item">
                {item.photos?.[0] ? (
                  <img className="roster-thumb" src={item.photos[0]} alt="" loading="lazy" />
                ) : (
                  <span className="roster-ic">{CATEGORY_LABELS[item.type].icon}</span>
                )}
                <div className="roster-meta">
                  <div className="roster-cat">{CATEGORY_LABELS[item.type].singular}</div>
                  <div className="roster-name">{item.name}</div>
                  <div className="roster-price tnum">{formatPrice(item.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function Overview() {
  const unassigned = unassignedItems();
  const shortlisted = VENUES.filter(
    (v) => v.status === "shortlisted" || v.status === "booked"
  ).length;
  const cheapest = VENUES.length
    ? Math.min(...VENUES.map((v) => scenarioTotal(v)).filter((n) => n > 0))
    : 0;
  const supplierCount = ALL_ITEMS.length - VENUES.length;
  const leadTotal = leadingScenarioTotal();
  const budget = budgetStatus(leadTotal);
  const lead = leadingVenue();

  if (ALL_ITEMS.length === 0) {
    return (
      <>
        <div className="page-head">
          <div className="eyebrow">Your wedding, curated</div>
          <h1>The Wedding Edit</h1>
        </div>
        <div className="empty">
          <div className="empty-mark">◆</div>
          No options yet. Paste me a venue link to begin — I'll pull the details and add it here.
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head reveal">
        <div className="eyebrow">Your wedding, curated</div>
        <h1>
          The <span className="serif-italic">Edit</span>
        </h1>
        <p className="lede">
          Every venue you're weighing up, with its photographers, catering and decor gathered
          alongside. Compare like for like, and watch the numbers add up.
        </p>
      </div>

      <div className="stat-band reveal" style={{ animationDelay: "80ms" }}>
        <div className="stat">
          <div className="stat-label">Venues</div>
          <div className="stat-value tnum">{VENUES.length}</div>
          <div className="stat-sub">{shortlisted} shortlisted</div>
        </div>
        <div className="stat">
          <div className="stat-label">Suppliers</div>
          <div className="stat-value tnum">{supplierCount}</div>
          <div className="stat-sub">{unassigned.length} unassigned</div>
        </div>
        <div className="stat">
          <div className="stat-label">Lowest scenario</div>
          <div className="stat-value tnum">{cheapest > 0 ? formatTotal(cheapest) : "—"}</div>
          <div className="stat-sub">venue + linked suppliers</div>
        </div>
        <div className="stat">
          <div className="stat-label">Options tracked</div>
          <div className="stat-value tnum">{ALL_ITEMS.length}</div>
          <div className="stat-sub">across 4 categories</div>
        </div>
      </div>

      <div className="planner-band reveal" style={{ animationDelay: "120ms" }}>
        <div className="budget-panel">
          <div className="bp-head">
            <span className="bp-label">Budget</span>
            <span className="bp-figures tnum">
              {formatTotal(budget.spent)} <span className="muted">/ {formatTotal(budget.budget)}</span>
            </span>
          </div>
          <div className="budget-bar">
            <span
              className={budget.over ? "over" : ""}
              style={{ width: `${Math.min(100, budget.pct)}%` }}
            />
          </div>
          <div className="bp-foot">
            {leadTotal > 0 ? (
              <>
                {budget.over ? (
                  <span style={{ color: "var(--st-passed)", fontWeight: 600 }}>
                    {formatTotal(-budget.remaining)} over budget
                  </span>
                ) : (
                  <span style={{ color: "var(--sage)", fontWeight: 600 }}>
                    {formatTotal(budget.remaining)} remaining
                  </span>
                )}
                {lead && <span className="muted"> · based on {lead.name}</span>}
              </>
            ) : (
              <span className="muted">Add prices to track spend against budget</span>
            )}
          </div>
        </div>
        <div className="date-panel">
          <span className="bp-label">Target dates</span>
          <div className="dp-value">{TARGET_DATE_LABEL}</div>
          <div className="muted" style={{ fontSize: "0.82rem" }}>
            Venues flag whether they're open on your dates.
          </div>
        </div>
      </div>

      <section className="section" style={{ marginTop: "1rem" }}>
        <div className="section-head">
          <h2>By venue</h2>
          <span className="section-meta">The organising thread — everything hangs off a venue</span>
        </div>
        {VENUES.map((venue, i) => (
          <VenueDossier key={venue.id} venue={venue} index={i} />
        ))}
      </section>

      {unassigned.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Not yet paired</h2>
            <span className="section-meta">Suppliers still looking for a venue</span>
          </div>
          <div className="roster-grid">
            {unassigned.map((item) => (
              <Link key={item.id} to={`/item/${item.id}`} className="roster-item">
                {item.photos?.[0] ? (
                  <img className="roster-thumb" src={item.photos[0]} alt="" loading="lazy" />
                ) : (
                  <span className="roster-ic">{CATEGORY_LABELS[item.type].icon}</span>
                )}
                <div className="roster-meta">
                  <div className="roster-cat">{CATEGORY_LABELS[item.type].singular}</div>
                  <div className="roster-name">{item.name}</div>
                  <div className="roster-price tnum">{formatPrice(item.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Jump to a category</h2>
        </div>
        <div className="roster-grid">
          {(["venue", "photographer", "catering", "decor"] as const).map((cat) => (
            <Link key={cat} to={`/category/${cat}`} className="roster-item">
              <span className="roster-ic">{CATEGORY_LABELS[cat].icon}</span>
              <div className="roster-meta">
                <div className="roster-cat">Browse</div>
                <div className="roster-name">{CATEGORY_LABELS[cat].plural}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
