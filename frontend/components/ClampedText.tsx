"use client";

import { useId, useState } from "react";

/** Below this many characters the text is short enough to show whole, with no toggle. */
const CLAMP_FROM = 420;

/**
 * A long description folded to a few lines with a "See more" toggle, the way marketplace
 * product pages do. The text is always in the DOM (search engines read all of it); only
 * the visible height is limited.
 */
export default function ClampedText({
  text,
  moreLabel,
  lessLabel,
}: {
  text: string;
  moreLabel: string;
  lessLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const clampable = text.length > CLAMP_FROM;

  return (
    <>
      <p id={id} className="clamped-text" data-clamped={clampable && !open ? "true" : undefined}>
        {text}
      </p>
      {clampable && (
        <button
          type="button"
          className="clamped-toggle"
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
