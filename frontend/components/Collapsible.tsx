"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Folds a long block (the circuit itinerary) to a fixed height with a fade and a
 * "See more" / "Hide" toggle. The content is always rendered, so it stays readable to
 * search engines; only its visible height is limited. `foldable` is decided by the
 * server from the amount of content, so nothing is measured in the browser.
 */
export default function Collapsible({
  children,
  foldable,
  moreLabel,
  lessLabel,
  collapsedHeight = 460,
}: {
  children: ReactNode;
  foldable: boolean;
  moreLabel: string;
  lessLabel: string;
  collapsedHeight?: number;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const folded = foldable && !open;

  return (
    <>
      <div
        id={id}
        className="tour-collapsible"
        data-folded={folded ? "true" : undefined}
        style={folded ? { maxHeight: collapsedHeight } : undefined}
      >
        {children}
      </div>
      {foldable && (
        <button
          type="button"
          className="tour-more"
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
