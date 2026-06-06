import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CATEGORY_LABELS, type Item } from "../types";
import { getItem, linkedItems } from "../data";
import {
  formatPrice,
  formatRating,
  formatCapacity,
  formatLocation,
  formatDate,
} from "../lib/format";
import { scenarioTotal, formatTotal } from "../lib/budget";
import { StatusPill } from "../components/StatusPill";

function Gallery({ item }: { item: Item }) {
  const photos = item.photos ?? [];
  if (photos.length === 0) {
    return (
      <div className="detail-gallery single">
        <div
          className="g-main"
          style={{
            display: "grid",
            placeItems: "center",
            background: "var(--paper-2)",
            fontSize: "4rem",
          }}
        >
          {CATEGORY_LABELS[item.type].icon}
        </div>
      </div>
    );
  }
  if (photos.length === 1) {
    return (
      <div className="detail-gallery single">
        <img className="g-main" src={photos[0]} alt={item.name} />
      </div>
    );
  }
  return (
    <div className="detail-gallery">
      <img className="g-main" src={photos[0]} alt={item.name} />
      <div className="g-side">
        <img src={photos[1]} alt="" />
        {photos[2] ? (
          <img src={photos[2]} alt="" />
        ) : (
          <div style={{ background: "var(--paper-2)" }} />
        )}
      </div>
    </div>
  );
}

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

      <Gallery item={item} />

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
            {item.type === "venue" && (
              <FactRow k="Est. scenario total" v={formatTotal(scenarioTotal(item))} />
            )}
            <FactRow k="Rating" v={item.rating?.score != null ? formatRating(item) : undefined} />
            <FactRow
              k="Capacity"
              v={item.capacity ? formatCapacity(item) : undefined}
            />
            <FactRow
              k="Setting"
              v={
                item.location?.setting ? (
                  <span style={{ textTransform: "capitalize" }}>{item.location.setting}</span>
                ) : undefined
              }
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
