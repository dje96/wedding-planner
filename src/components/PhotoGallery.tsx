import { useState } from "react";
import { Lightbox } from "./Lightbox";

export function PhotoGallery({
  photos,
  alt,
  placeholder,
}: {
  photos: string[];
  alt: string;
  placeholder: string;
}) {
  const [lbIndex, setLbIndex] = useState<number | null>(null);

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
          {placeholder}
        </div>
      </div>
    );
  }

  const open = (i: number) => setLbIndex(i);
  const extra = photos.length - 3;

  return (
    <>
      <div className={`detail-gallery${photos.length === 1 ? " single" : ""}`}>
        <button className="g-main g-tile" onClick={() => open(0)} aria-label="Open photo gallery">
          <img src={photos[0]} alt={alt} />
        </button>
        {photos.length > 1 && (
          <div className="g-side">
            <button className="g-tile" onClick={() => open(1)} aria-label="Open photo gallery">
              <img src={photos[1]} alt="" loading="lazy" />
            </button>
            {photos[2] ? (
              <button className="g-tile" onClick={() => open(2)} aria-label="Open photo gallery">
                <img src={photos[2]} alt="" loading="lazy" />
                {extra > 0 && <span className="g-more">+{extra} more</span>}
              </button>
            ) : (
              <div style={{ background: "var(--paper-2)" }} />
            )}
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <div className="gallery-strip">
          {photos.map((p, i) => (
            <button
              key={p + i}
              className="strip-thumb"
              onClick={() => open(i)}
              aria-label={`View photo ${i + 1}`}
            >
              <img src={p} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lbIndex !== null && (
        <Lightbox
          photos={photos}
          index={lbIndex}
          alt={alt}
          onClose={() => setLbIndex(null)}
          onIndex={setLbIndex}
        />
      )}
    </>
  );
}
