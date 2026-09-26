"use client";

import { useState } from "react";

/**
 * A card with two faces. The front shows who or what it is, with the buttons; a click anywhere on
 * it that is not a button or a link turns it over to the back, which carries the other details.
 * Both faces share one grid cell so the card is as tall as the taller of the two, and the face
 * turned away is `inert` so its buttons cannot be reached by keyboard.
 */
export default function FlipCard({
  front,
  back,
  label,
  className = "",
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  /** What the card is, for screen readers: "Réservation de Ariana Correia". */
  label: string;
  className?: string;
}) {
  const [flipped, setFlipped] = useState(false);

  const face =
    "card [grid-area:1/1] rounded-2xl p-4 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]";

  return (
    <div className={`h-full [perspective:1600px] ${className}`}>
      <div
        role="group"
        aria-label={label}
        tabIndex={0}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a,button,input,select,textarea,label")) return;
          setFlipped((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setFlipped((value) => !value);
          }
        }}
        className={`grid h-full cursor-pointer transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className={face} inert={flipped} aria-hidden={flipped}>
          {front}
        </div>
        <div className={`${face} [transform:rotateY(180deg)]`} inert={!flipped} aria-hidden={!flipped}>
          {back}
        </div>
      </div>
    </div>
  );
}

/** The small hint at the bottom of a face: it tells the card can be turned. */
export function FlipHint({ back }: { back?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-navy-700/40">
      <i className="bi bi-arrow-repeat" aria-hidden />
      {back ? "Retourner" : "Cliquer pour les détails"}
    </span>
  );
}
