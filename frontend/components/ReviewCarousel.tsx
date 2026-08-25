"use client";

import { useEffect, useRef, useState } from "react";
import Stars from "@/components/Stars";
import PlatformBadge from "@/components/PlatformBadge";
import type { Review } from "@/lib/types";

export default function ReviewCarousel({ reviews }: { reviews: Review[] }) {
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
  }, [reviews]);

  function scroll(dir: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".review-slide");
    const step = (card?.offsetWidth ?? 320) + 20;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <div className="carousel">
      <div className="carousel-track" ref={trackRef}>
        {reviews.map((r) => (
          <article className="review review-slide" key={r.id}>
            <Stars n={r.rating} />
            {r.title && <h3>{r.title}</h3>}
            <p className="body">{r.body}</p>
            <div className="who">
              <span>
                <span className="n">{r.name}</span>
                <span style={{ color: "var(--muted)" }}> · {r.country}</span>
              </span>
              <PlatformBadge source={r.source} />
            </div>
          </article>
        ))}
      </div>
      {canScroll && (
        <div className="carousel-nav">
          <button type="button" onClick={() => scroll(-1)} disabled={atStart} aria-label="Previous review">
            ‹
          </button>
          <button type="button" onClick={() => scroll(1)} disabled={atEnd} aria-label="Next review">
            ›
          </button>
        </div>
      )}
    </div>
  );
}
