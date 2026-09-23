"use client";

import { useEffect, useRef } from "react";

/**
 * When a booking wizard moves to another step, bring the guest to the step's
 * own content - its heading and the fields under it - rather than leaving them
 * wherever the previous (possibly long) step left the page, or jumping to the
 * very top under the site header. Skips the first render so opening the page
 * does not scroll.
 *
 * Attach the returned ref to the wizard's root element. If the wizard lives
 * inside a scrolling `.tour-booking-card` (the sticky sidebar on the camp and
 * circuit pages) that card is scrolled instead of the page.
 */
export function useStepScroll(step: number) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const root = ref.current;
    if (!root) return;

    // The step's own heading ("03 Dates and travelers ...") is where the
    // fields begin; the stepper above it is not needed on screen again.
    const anchor = root.querySelector<HTMLElement>(".tour-book-step-heading") ?? root;

    const card = root.closest<HTMLElement>(".tour-booking-card");
    const cardScrolls = !!card && card.scrollHeight > card.clientHeight + 4 && getComputedStyle(card).overflowY !== "visible";
    if (card && cardScrolls) {
      const offset = anchor.getBoundingClientRect().top - card.getBoundingClientRect().top;
      card.scrollTo({ top: card.scrollTop + offset - 12, behavior: "smooth" });
      return;
    }

    // Leave room for the fixed site header, and only move the page when the
    // heading is not already comfortably on screen.
    const HEADER_CLEARANCE = 130;
    const top = anchor.getBoundingClientRect().top;
    if (top < HEADER_CLEARANCE || top > window.innerHeight - 160) {
      window.scrollTo({ top: Math.max(0, window.scrollY + top - HEADER_CLEARANCE), behavior: "smooth" });
    }
  }, [step]);

  return ref;
}
