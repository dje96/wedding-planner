import { Link, Navigate, useParams } from "react-router-dom";
import { CATEGORY_LABELS, type Item } from "../types";
import { getItem, getReviewItem, linkedItems } from "../data";
import { formatPrice, formatLocation, formatDate } from "../lib/format";
import { coreFields, inclusionRows } from "../lib/core";
import { StatusPill } from "../components/StatusPill";
import { PhotoGallery } from "../components/PhotoGallery";
import { DeleteOption } from "../components/DeleteOption";
import { ReviewActions } from "../components/ReviewActions";

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  // Resolve a tracked option first; fall back to a Scout candidate in the
  // Review queue so review items open in the full detail view too.
  const optionItem = id ? getItem(id) : undefined;
  const reviewItem = !optionItem && id ? getReviewItem(id) : undefined;
  const item = optionItem ?? reviewItem;
  if (!item) return <Navigate to="/" replace />;
  const isReview = !!reviewItem;

  const meta = CATEGORY_LABELS[item.type];
  const pairedVenue = item.venueId ? getItem(item.venueId) : undefined;
  const linked = item.type === "venue" ? linkedItems(item.id) : [];
  const core = coreFields(item);
  const c = item.contact;

  return (
    <div className="reveal">
      <Link
        to={isReview ? "/review" : item.type === "venue" ? "/" : `/category/${item.type}`}
        className="back-link"
      >
        ← {isReview ? "Review" : meta.plural}
      </Link>

      <PhotoGallery photos={item.photos ?? []} alt={item.name} placeholder={meta.icon} />

      <div className="page-head" style={{ marginBottom: "1.75rem" }}>
        <div className="eyebrow">{isReview ? `Scout candidate · ${meta.singular}` : meta.singular}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>{item.name}</h1>
          <StatusPill status={item.status} />
        </div>
        <div className="loc" style={{ color: "var(--brass)", marginTop: "0.5rem" }}>
          {formatLocation(item)}
        </div>
      </div>

      {item.flags && item.flags.length > 0 && (
        <div className="notices">
          {item.flags.map((f, i) => (
            <div key={i} className={`notice notice-${f.level}`}>
              <span className="notice-mark">{f.level === "warn" ? "⚠" : "?"}</span>
              <span className="notice-text">
                <strong>{f.label}</strong>
                {f.detail ? <> — {f.detail}</> : null}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Core facts — shown consistently for every item, in CORE_KEYS order, as a
          dense multi-column table. A missing value reads as "Unknown" so the
          skeleton stays identical across items. */}
      <div className="facts">
        {core.map((f) => (
          <div key={f.key} className="fact">
            <span className="fact-k">{f.label}</span>
            <span className={f.known ? "fact-v" : "fact-v unknown"}>
              {f.known ? f.node : "Unknown"}
            </span>
          </div>
        ))}
      </div>

      {/* The three detail questions — always shown, even when empty, so a gap is
          visible rather than hidden. */}
      <DetailBuckets item={item} />

      <div className="detail-grid">
        <div>
          {item.description && <p className="desc">{item.description}</p>}

          {isReview && item.scoutNote && <div className="detail-notes">🔎 {item.scoutNote}</div>}

          {item.notes && <div className="detail-notes">“{item.notes}”</div>}

          {pairedVenue && (
            <p className="muted" style={{ marginTop: "1.5rem" }}>
              Being considered for{" "}
              <Link to={`/item/${pairedVenue.id}`} className="btn-link">
                {pairedVenue.name}
              </Link>
              .
            </p>
          )}

          {item.type === "venue" && linked.length > 0 && (
            <section style={{ marginTop: "2rem" }}>
              <div className="roster-label">Paired suppliers</div>
              <div className="roster-grid">
                {linked.map((l) => (
                  <Link key={l.id} to={`/item/${l.id}`} className="roster-item">
                    {l.photos?.[0] ? (
                      <img className="roster-thumb" src={l.photos[0]} alt="" loading="lazy" />
                    ) : (
                      <span className="roster-ic">{CATEGORY_LABELS[l.type].icon}</span>
                    )}
                    <div className="roster-meta">
                      <div className="roster-cat">{CATEGORY_LABELS[l.type].singular}</div>
                      <div className="roster-name">{l.name}</div>
                      <div className="roster-price tnum">{formatPrice(l.price)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="tag-row">
              {item.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}

          <a href={item.url} target="_blank" rel="noreferrer" className="source-link">
            View original listing ↗
          </a>
        </div>

        <aside>
          {(c?.name || c?.email || c?.phone) && (
            <div className="factsheet">
              <FactRow k="Contact" v={c?.name} />
              <FactRow k="Email" v={c?.email} />
              <FactRow k="Phone" v={c?.phone} />
            </div>
          )}

          <p className="faint" style={{ fontSize: "0.78rem", marginTop: "1rem" }}>
            Added {formatDate(item.addedAt)}
          </p>

          {isReview ? <ReviewActions item={item} /> : <DeleteOption item={item} />}
        </aside>
      </div>
    </div>
  );
}

/** The three category-specific detail lists — what's included, optional add-ons,
 *  and restrictions. Every section renders for every item; an empty one shows a
 *  "not recorded yet" placeholder so a missing answer is visible. */
function DetailBuckets({ item }: { item: Item }) {
  const inclusions = inclusionRows(item);
  const addOns = item.addOns ?? [];
  const restrictions = item.restrictions ?? [];

  // Three-state mark: covered ✓ / unconfirmed ? / explicitly excluded ✗.
  const MARK: Record<string, { glyph: string; cls: string }> = {
    yes: { glyph: "✓", cls: "prop-yes" },
    unknown: { glyph: "?", cls: "prop-unknown" },
    no: { glyph: "✗", cls: "prop-no" },
  };

  return (
    <div className="buckets">
      <section className="bucket">
        <div className="bucket-head">Included in the price</div>
        <div className="incl-list">
          {inclusions.map((x) => {
            const m = MARK[x.state];
            return (
              <div key={x.key} className={x.state === "unknown" ? "incl incl-faint" : "incl"}>
                <span className={`prop-mark ${m.cls}`}>{m.glyph}</span>
                <span className="incl-body">
                  <span className="incl-label">{x.label}</span>
                  {x.note && <span className="incl-note">{x.note}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bucket">
        <div className="bucket-head">Optional add-ons</div>
        {addOns.length > 0 ? (
          <div className="addon-list">
            {addOns.map((a, i) => (
              <div key={i} className="addon-row">
                <span className="addon-body">
                  <span className="addon-label">{a.label}</span>
                  {a.note && <span className="addon-note">{a.note}</span>}
                </span>
                <span className="addon-cost">
                  {a.price?.amount != null ? `+${formatPrice(a.price)}` : "price TBC"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="bucket-empty">None recorded yet.</p>
        )}
      </section>

      <section className="bucket">
        <div className="bucket-head">Restrictions</div>
        {restrictions.length > 0 ? (
          <div className="restr-list">
            {restrictions.map((r, i) => (
              <div key={i} className="restr-row">
                <span className="restr-label">{r.label}</span>
                {r.note && <span className="restr-note">{r.note}</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="bucket-empty">None recorded yet.</p>
        )}
      </section>
    </div>
  );
}

function FactRow({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="fs-row">
      <span className="fs-k">{k}</span>
      <span className="fs-v">{v}</span>
    </div>
  );
}
