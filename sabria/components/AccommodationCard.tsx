import Image from "next/image";
import Link from "next/link";
import type { Accommodation } from "@/lib/types";

export default function AccommodationCard({
  staySlug,
  accommodation,
}: {
  staySlug: string;
  accommodation: Accommodation;
}) {
  return (
    <article className="accommodation-card">
      <div className="accommodation-image">
        <Image src={accommodation.image} alt={accommodation.title} fill sizes="(max-width: 700px) 100vw, 33vw" />
      </div>
      <div className="accommodation-copy">
        <p className="sect-eyebrow">From €{accommodation.priceFrom} · {accommodation.sleeps}</p>
        <h3>{accommodation.title}</h3>
        <p>{accommodation.tagline}</p>
        <Link
          href={`/camp/${staySlug}/${accommodation.slug}`}
          className="text-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Explore this stay ↗
        </Link>
      </div>
    </article>
  );
}
