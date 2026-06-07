import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS } from "../types";
import { getItem, linkedItems } from "../data";
import {
  formatPrice,
  formatRating,
  formatCapacity,
  formatLocation,
  formatSetting,
  formatDate,
} from "../lib/format";
import { scenarioTotal, formatTotal, stayNights } from "../lib/budget";
import { targetDateMatch } from "../lib/dates";
import { StatusPill } from "../components/StatusPill";
import { PhotoGallery } from "../components/PhotoGallery";
import { DeleteOption } from "../components/DeleteOption";

const DATE_MATCH_NOTE: Record<ReturnType<typeof targetDateMatch>, ReactNode> = {
  available: <span style={{ color: "var(--sage)" }}>✓ open on a target date</span>,
  conflict: <span style={{ color: "var(--st-passed)" }}>⚠ none of your dates open</span>,
  unknown: <span className="faint">check 2026 availability</span>,
};

function FactRow({ k, v }: { k: string; v?: ReactNode }) {
  if (v == null || v === "—" || v === "") return null;
  return (
    <div className="fs-row">
      <span className="fs-k">{k}</span>
      <span className="fs-v">{v}</span>
    </div>
  );
}

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const item = id ? getItem(id) : undefined;
  if (!item) return <Navigate to="/" replace />;

  const meta = CATEGORY_LABELS[item.type];
  const pairedVenue = item.venueId ? getItem(item.venueId) : undefined;
  const linked = item.type === "venue" ? linkedItems(item.id) : [];
  const c = item.contact;

  return (
    <div className="reveal">
      <Link to={item.type === "venue" ? "/" : `/category/${item.type}`} className="back-link">
        ← {meta.plural}
      </Link>

      <PhotoGallery
        photos={item.photos ?? []}
        alt={item.name}
        placeholder={meta.icon}
      />

      <div className="page-head" style={{ marginBottom: "2rem" }}>
        <div className="eyebrow">{meta.singular}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>{item.name}</h1>
          <StatusPill status={item.status} />
        </div>
        <div className="loc" style={{ color: "var(--brass)", marginTop: "0.5rem" }}>
          {formatLocation(item)}
        </div>
      </div>

      <div className="detail-grid">
        <div>
          {item.description && <p className="desc">{item.description}</p>}

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
          <div className="factsheet">
            <FactRow k="Price" v={formatPrice(item.price)} />
            {item.type === "venue" && item.eventType && (
              <FactRow
                k="Event type"
                v={
                  item.eventType === "family_stay"
                    ? `${EVENT_TYPE_LABELS[item.eventType]} · ${stayNights(item)} nights`
                    : EVENT_TYPE_LABELS[item.eventType]
                }
              />
            )}
            {item.type === "venue" && (
              <FactRow k="Est. scenario total" v={formatTotal(scenarioTotal(item))} />
            )}
            {item.type === "venue" && (
              <FactRow k="Target dates" v={DATE_MATCH_NOTE[targetDateMatch(item)]} />
            )}
            <FactRow k="Rating" v={item.rating?.score != null ? formatRating(item) : undefined} />
            <FactRow
              k="Capacity"
              v={item.capacity ? formatCapacity(item) : undefined}
            />
            <FactRow
              k="Setting"
              v={item.location?.setting ? formatSetting(item) : undefined}
            />
            <FactRow k="Lead time" v={item.availability?.leadTimeWeeks ? `${item.availability.leadTimeWeeks} wks` : undefined} />
            {item.availability?.openDates?.length ? (
              <FactRow k="Open dates" v={item.availability.openDates.map(formatDate).join(" · ")} />
            ) : null}
            {item.attributes &&
              Object.entries(item.attributes).map(([k, v]) => (
                <FactRow key={k} k={prettyKey(k)} v={v} />
              ))}
          </div>

          {(c?.name || c?.email || c?.phone) && (
            <div className="factsheet" style={{ marginTop: "1rem" }}>
              <FactRow k="Contact" v={c?.name} />
              <FactRow k="Email" v={c?.email} />
              <FactRow k="Phone" v={c?.phone} />
            </div>
          )}

          <p className="faint" style={{ fontSize: "0.78rem", marginTop: "1rem" }}>
            Added {formatDate(item.addedAt)}
          </p>

          <DeleteOption item={item} />
        </aside>
      </div>
    </div>
  );
}

function prettyKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
