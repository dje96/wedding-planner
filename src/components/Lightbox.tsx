import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

interface LightboxProps {
  photos: string[];
  index: number;
  alt: string;
  onClose: () => void;
  onIndex: (i: number) => void;
}

export function Lightbox({ photos, index, alt, onClose, onIndex }: LightboxProps) {
  const prev = useCallback(
    () => onIndex((index - 1 + photos.length) % photos.length),
    [index, photos.length, onIndex]
  );
  const next = useCallback(
    () => onIndex((index + 1) % photos.length),
    [index, photos.length, onIndex]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    // Lock background scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, prev, next]);

  // Render through a portal to <body> so `position: fixed` is anchored to the
  // viewport, not to any transformed/animated ancestor (e.g. the .reveal page).
  return createPortal(
    <div className="lb-backdrop" onClick={onClose}>
      <button className="lb-close" onClick={onClose} aria-label="Close gallery">
        ✕
      </button>
      <div className="lb-counter">
        {index + 1} / {photos.length}
      </div>

      {photos.length > 1 && (
        <button
          className="lb-nav lb-prev"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
        >
          ‹
        </button>
      )}

      <img
        className="lb-image"
        src={photos[index]}
        alt={`${alt} — photo ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
      />

      {photos.length > 1 && (
        <button
          className="lb-nav lb-next"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
        >
          ›
        </button>
      )}

      {photos.length > 1 && (
        <div className="lb-thumbs" onClick={(e) => e.stopPropagation()}>
          {photos.map((p, i) => (
            <img
              key={p + i}
              src={p}
              alt=""
              loading="lazy"
              className={i === index ? "active" : ""}
              onClick={() => onIndex(i)}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
