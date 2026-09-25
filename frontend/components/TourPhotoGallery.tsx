"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ShareButton from "@/components/ShareButton";
import WishlistButton from "@/components/WishlistButton";

export default function TourPhotoGallery({
  media,
  suppliedMediaCount,
  title,
  slug,
}: {
  media: string[];
  suppliedMediaCount: number;
  title: string;
  slug: string;
}) {
  const t = useTranslations("tourDetail");
  const tGallery = useTranslations("galleryGrid");
  // Index of the photo shown in the viewer, or null when it is closed.
  const [open, setOpen] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = suppliedMediaCount || media.length;
  const preview = media.slice(0, 5);

  const isOpen = open !== null;
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
      if (event.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % media.length));
      if (event.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + media.length) % media.length));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, media.length]);

  function updateActiveImage() {
    const track = trackRef.current;
    if (!track) return;
    const trackLeft = track.getBoundingClientRect().left;
    const slides = Array.from(track.children) as HTMLElement[];
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.getBoundingClientRect().left - trackLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setActiveIndex(closestIndex);
  }

  function goToImage(index: number) {
    const slide = trackRef.current?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  return (
    <>
      <section className={`tour-gallery media-count-${preview.length}`} aria-label={title}>
        <div className="tour-media-primary">
          <Image src={preview[0]} alt={suppliedMediaCount ? title : ""} fill sizes="(max-width: 900px) 100vw, 58vw" preload />
          <button type="button" aria-label={`${title} — 1`} onClick={() => setOpen(0)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, padding: 0, background: "transparent", cursor: "zoom-in" }} />
        </div>
        {preview.length > 1 && (
          <div className="tour-media-secondary">
            {preview.slice(1).map((source, index) => {
              const isLast = index === preview.slice(1).length - 1;
              const remaining = count - preview.length;
              return (
                <div className="tour-media-cell" key={`${source}-${index}`}>
                  <Image src={source} alt={`${title} — ${index + 2}`} fill sizes="(max-width: 900px) 50vw, 20vw" />
                  <button type="button" aria-label={`${title} — ${index + 2}`} onClick={() => setOpen(index + 1)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, padding: 0, background: "transparent", cursor: "zoom-in" }} />
                  {isLast && remaining > 0 && (
                    <button type="button" className="tour-gallery-viewall" onClick={() => setOpen(0)} style={{ zIndex: 1 }}>
                      {t("viewAllPhotos", { count })}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="tour-mobile-track" ref={trackRef} onScroll={updateActiveImage}>
          {media.map((source, index) => (
            <figure className="tour-mobile-slide" key={`${source}-mobile-${index}`} onClick={() => setOpen(index)}>
              <Image
                src={source}
                alt={suppliedMediaCount ? `${title} — ${index + 1}` : ""}
                fill
                sizes="100vw"
                preload={index === 0}
              />
            </figure>
          ))}
        </div>

        <div className="tour-mobile-media-actions">
          <Link href="/circuits" className="tour-mobile-back" aria-label={t("breadcrumbCircuits")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="tour-mobile-action-pair">
            <WishlistButton slug={slug} variant="inline" />
            <ShareButton title={title} />
          </span>
        </div>

        {media.length > 1 && (
          <div className="tour-mobile-dots" aria-label={t("viewAllPhotos", { count })}>
            {media.map((source, index) => (
              <button
                type="button"
                key={`${source}-dot-${index}`}
                data-active={index === activeIndex}
                aria-label={`${index + 1} / ${media.length}`}
                onClick={() => goToImage(index)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          className="tour-mobile-photo-count"
          aria-label={t("viewAllPhotos", { count })}
          onClick={() => setOpen(0)}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9" r="1.5" />
            <path d="m4 17 5-5 4 4 2-2 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {count}
        </button>
      </section>

      {open !== null && (
        <div className="acc-lightbox" role="dialog" aria-modal="true" aria-label={title}>
          <button type="button" className="acc-lightbox-close" onClick={() => setOpen(null)} aria-label={tGallery("close")} autoFocus>
            ×
          </button>
          {media.length > 1 && (
            <button
              type="button"
              className="acc-lightbox-nav acc-lightbox-prev"
              onClick={() => setOpen((open - 1 + media.length) % media.length)}
              aria-label={t("photoPrevious")}
            >
              ‹
            </button>
          )}
          <div className="acc-lightbox-stage">
            <Image src={media[open]} alt={`${title} — ${open + 1}`} fill sizes="100vw" style={{ objectFit: "contain" }} />
          </div>
          {media.length > 1 && (
            <button
              type="button"
              className="acc-lightbox-nav acc-lightbox-next"
              onClick={() => setOpen((open + 1) % media.length)}
              aria-label={t("photoNext")}
            >
              ›
            </button>
          )}
          <p className="acc-lightbox-count">{t("photoOf", { n: open + 1, total: media.length })}</p>
        </div>
      )}
    </>
  );
}
