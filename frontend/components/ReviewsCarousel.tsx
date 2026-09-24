"use client";

import { Children, useEffect, useRef, useState } from "react";

/**
 * A swipeable, scroll-snapping row of review cards with previous/next
 * buttons. The cards themselves are rendered on the server and passed in as
 * children, so the reviews' text stays in the HTML (indexable) — only the
 * scrolling behaviour is client-side. Works in right-to-left languages too.
 */
export default function ReviewsCarousel({
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
      // scrollLeft is negative in RTL — compare its magnitude either way.
      const offset = Math.abs(track.scrollLeft);
      setCanScroll(track.scrollWidth > track.clientWidth + 4);
      setAtStart(offset <= 4);
      setAtEnd(offset + track.clientWidth >= track.scrollWidth - 4);
    };
    check();

    const observer = new ResizeObserver(check);
    observer.observe(track);
    track.addEventListener("scroll", check, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", check);
    };
  }, []);

  function scroll(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.querySelector<HTMLElement>(".reviews-carousel-slide");
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = (slide?.offsetWidth ?? 320) + gap;
    // "Forward" is towards negative scrollLeft in a right-to-left page.
    const sign = getComputedStyle(track).direction === "rtl" ? -1 : 1;
    track.scrollBy({ left: direction * sign * step, behavior: "smooth" });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scroll(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scroll(-1);
    }
  }

  return (
    <div className="reviews-carousel">
      <div
        className="reviews-carousel-track"
        ref={trackRef}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        onKeyDown={onKeyDown}
      >
        {Children.map(children, (child) => (
          <div className="reviews-carousel-slide">{child}</div>
        ))}
      </div>

      {canScroll && (
        <div className="reviews-carousel-nav">
          <button type="button" onClick={() => scroll(-1)} disabled={atStart} aria-label={previousLabel}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" onClick={() => scroll(1)} disabled={atEnd} aria-label={nextLabel}>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </div>
  );
}
