import Image from "next/image";
import Link from "next/link";
import type { Stay } from "@/lib/types";

export default function StayCard({ stay }: { stay: Stay }) {
  return (
    <Link className="card" href={`/camp/${stay.slug}`}>
      <Image
        src={stay.image}
        alt={stay.tagline}
        fill
        sizes="(max-width: 900px) 100vw, 33vw"
      />
      <div className="cap">
        <span className="num">{stay.kicker}</span>
        <h3>{stay.title}</h3>
        <p>{stay.description}</p>
      </div>
    </Link>
  );
}
