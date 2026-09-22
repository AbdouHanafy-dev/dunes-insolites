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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = suppliedMediaCount || media.length;
  const preview = media.slice(0, 5);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

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
          <Image src={preview[0]} alt={suppliedMediaCount ? title : ""} fill sizes="(max-width: 900px) 100vw, 58vw" priority />
        </div>
        {preview.length > 1 && (
          <div className="tour-media-secondary">
            {preview.slice(1).map((source, index) => {
              const isLast = index === preview.slice(1).length - 1;
              const remaining = count - preview.length;
              return (
                <div className="tour-media-cell" key={`${source}-${index}`}>
                  <Image src={source} alt={`${title} — ${index + 2}`} fill sizes="(max-width: 900px) 50vw, 20vw" />
                  {isLast && remaining > 0 && (
                    <button type="button" className="tour-gallery-viewall" onClick={() => setOpen(true)}>
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
            <figure className="tour-mobile-slide" key={`${source}-mobile-${index}`}>
              <Image
                src={source}
                alt={suppliedMediaCount ? `${title} — ${index + 1}` : ""}
                fill
                sizes="100vw"
                priority={index === 0}
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
          onClick={() => setOpen(true)}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9" r="1.5" />
            <path d="m4 17 5-5 4 4 2-2 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {count}
        </button>
      </section>

      {open && (
        <div
          className="tour-photo-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={t("viewAllPhotos", { count })}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <div className="tour-photo-dialog-panel">
            <button type="button" className="tour-photo-dialog-close" onClick={() => setOpen(false)} autoFocus>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
              <span className="sr-only">{tGallery("close")}</span>
            </button>
            <div className="tour-photo-dialog-grid">
              {media.map((source, index) => (
                <figure key={`${source}-dialog-${index}`}>
                  <Image src={source} alt={`${title} — ${index + 1}`} fill sizes="(max-width: 700px) 46vw, 30vw" />
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
