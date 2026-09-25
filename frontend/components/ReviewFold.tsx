"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Keeps a long review from stretching its card: the text and the owner's reply are
 * clamped to a few lines with a "Read more" / "Show less" toggle. The full text is
 * always in the page (only clipped by CSS), and the server decides `foldable` from the
 * text length, so nothing is measured in the browser.
 */
export default function ReviewFold({
  children,
  foldable,
  moreLabel,
  lessLabel,
}: {
  children: ReactNode;
  foldable: boolean;
  moreLabel: string;
  lessLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const folded = foldable && !open;

  return (
    <>
      <div id={id} className="review-fold" data-folded={folded ? "true" : undefined}>
        {children}
      </div>
      {foldable && (
        <button
          type="button"
          className="review-more"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? lessLabel : moreLabel}
        </button>
      )}
    </>
  );
}
