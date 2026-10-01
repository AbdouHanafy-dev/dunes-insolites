"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Horizontal scroll-snap carousel, same mechanics as ReviewCarousel — but
 * generic over its children rather than importing TourCard directly: TourCard
 * is an async Server Component (it awaits getTranslations), which a Client
 * Component cannot import and render itself. The caller (a Server Component)
 * renders the TourCards and passes them in as children instead.
 */
export default function TourCardCarousel({
  children,
  previousLabel,
  nextLabel,
}: {
  children: React.ReactNode;
  previousLabel: string;
  nextLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const check = () => {
      setCanScroll(track.scrollWidth > track.clientWidth + 4);
      setAtStart(track.scrollLeft <= 4);
      setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);
    };
    check();

    const observer = new ResizeObserver(check);
    observer.observe(track);
    track.addEventListener("scroll", check, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", check);
    };
  }, [children]);

  function scroll(dir: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".tour-card-slide");
    const step = (card?.offsetWidth ?? 320) + 20;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <div className="carousel">
      <div className="carousel-track" ref={trackRef}>
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div className="tour-card-slide" key={i}>
                {child}
              </div>
            ))
          : <div className="tour-card-slide">{children}</div>}
      </div>
      {canScroll && (
        <div className="carousel-nav">
          <button type="button" onClick={() => scroll(-1)} disabled={atStart} aria-label={previousLabel}>
            ‹
          </button>
          <button type="button" onClick={() => scroll(1)} disabled={atEnd} aria-label={nextLabel}>
            ›
          </button>
        </div>
      )}
    </div>
  );
}
