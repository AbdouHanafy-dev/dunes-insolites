"use client";

import { useState } from "react";

/**
 * Replaces the plain "5 / 5" dropdown on the review form (found live, UI/UX
 * pass 31 Aug 2026) with a real clickable star picker - hover previews the
 * value, click commits it, same 1-5 integer the backend already expects.
 */
export default function StarRatingInput({
  id,
  value,
  onChange,
  label,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value;

  return (
    <div
      id={id}
      className="star-rating-input"
      role="radiogroup"
      aria-label={label}
      onMouseLeave={() => setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} / 5`}
          data-filled={n <= shown}
          onMouseEnter={() => setHovered(n)}
          onFocus={() => setHovered(n)}
          onBlur={() => setHovered(null)}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
      <span className="star-rating-value">{value} / 5</span>
    </div>
  );
}
