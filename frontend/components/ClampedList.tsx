"use client";

import { useId, useState } from "react";

/**
 * A bullet list folded to its first few items behind a "See more" toggle. Every item
 * stays in the page (search engines read them all); only the visible ones are limited.
 */
export default function ClampedList({
  items,
  limit = 4,
  moreLabel,
  lessLabel,
}: {
  items: string[];
  limit?: number;
  moreLabel: string;
  lessLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const foldable = items.length > limit;

  return (
    <>
      <ul id={id} className="tour-bullets">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} hidden={foldable && !open && index >= limit}>
            {item}
          </li>
        ))}
      </ul>
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
