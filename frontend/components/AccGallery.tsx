"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * One large photo plus four smaller ones, and a full-screen viewer behind
 * "View all photos" (arrow keys and Escape work; body scroll is locked
 * while it is open).
 */
export default function AccGallery({
  photos,
  title,
  labels,
}: {
  photos: string[];
  title: string;
  labels: { viewAll: string; close: string; previous: string; next: string; photoOf: string };
}) {
  const [open, setOpen] = useState<number | null>(null);
  const preview = photos.slice(0, 5);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, photos.length]);

  return (
    <div className="acc-gallery">
      <div className="acc-gallery-grid">
        {preview.map((src, i) => (
          <button
            key={src + i}
            type="button"
            className={i === 0 ? "acc-gallery-main" : "acc-gallery-thumb"}
            onClick={() => setOpen(i)}
            aria-label={`${title} — ${i + 1}`}
          >
            <Image
              src={src}
              alt={`${title} — ${i + 1}`}
              fill
              sizes={i === 0 ? "(max-width: 900px) 100vw, 50vw" : "(max-width: 900px) 50vw, 25vw"}
              priority={i === 0}
            />
          </button>
        ))}
        <button type="button" className="acc-gallery-all" onClick={() => setOpen(0)}>
          {labels.viewAll} ({photos.length})
        </button>
      </div>

      {open !== null && (
        <div className="acc-lightbox" role="dialog" aria-modal="true" aria-label={title}>
          <button type="button" className="acc-lightbox-close" onClick={() => setOpen(null)} aria-label={labels.close}>
            ×
          </button>
          <button
            type="button"
            className="acc-lightbox-nav acc-lightbox-prev"
            onClick={() => setOpen((open - 1 + photos.length) % photos.length)}
            aria-label={labels.previous}
          >
            ‹
          </button>
          <div className="acc-lightbox-stage">
            <Image src={photos[open]} alt={`${title} — ${open + 1}`} fill sizes="100vw" style={{ objectFit: "contain" }} />
          </div>
          <button
            type="button"
            className="acc-lightbox-nav acc-lightbox-next"
            onClick={() => setOpen((open + 1) % photos.length)}
            aria-label={labels.next}
          >
            ›
          </button>
          <p className="acc-lightbox-count">
            {labels.photoOf.replace("{n}", String(open + 1)).replace("{total}", String(photos.length))}
          </p>
        </div>
      )}
    </div>
  );
}
