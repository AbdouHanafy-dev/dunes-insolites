"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GalleryItem } from "@/lib/types";

export default function GalleryGrid({
  items,
  tags,
}: {
  items: GalleryItem[];
  tags: string[];
}) {
  const [tag, setTag] = useState("All");
  // The lightbox index is stored with the filter it belongs to, so switching
  // filters closes it without an effect having to reset anything.
  const [opened, setOpened] = useState<{ tag: string; index: number } | null>(null);
  const open = opened && opened.tag === tag ? opened.index : null;

  const shown = useMemo(
    () => (tag === "All" ? items : items.filter((i) => i.tag === tag)),
    [items, tag],
  );

  const setOpen = useCallback(
    (index: number | null) => setOpened(index === null ? null : { tag, index }),
    [tag],
  );

  const step = useCallback(
    (dir: 1 | -1) =>
      setOpened((o) =>
        o === null ? null : { ...o, index: (o.index + dir + shown.length) % shown.length },
      ),
    [shown.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpened(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  const current = open === null ? null : shown[open];

  return (
    <>
      <div className="filters">
        {tags.map((t) => (
          <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="masonry">
        {shown.map((item, i) => (
          <button
            key={`${item.src}-${i}`}
            type="button"
            className={`g${item.tall ? " tall" : ""}`}
            style={{ border: 0, padding: 0, cursor: "zoom-in" }}
            onClick={() => setOpen(i)}
            aria-label={`Open ${item.alt}`}
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 700px) 100vw, (max-width: 900px) 50vw, 33vw"
            />
          </button>
        ))}
      </div>

      {current && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          onClick={() => setOpen(null)}
        >
          <button className="close" aria-label="Close" onClick={() => setOpen(null)}>
            ✕
          </button>
          <button
            className="nav-btn prev"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
          >
            ←
          </button>
          <div className="frame" onClick={(e) => e.stopPropagation()}>
            <Image src={current.src} alt={current.alt} fill sizes="100vw" />
          </div>
          <button
            className="nav-btn next"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
