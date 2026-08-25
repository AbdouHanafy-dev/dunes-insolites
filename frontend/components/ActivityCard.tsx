import Image from "next/image";
import Link from "next/link";
import type { Activity } from "@/lib/types";

export default function ActivityCard({
  activity,
  preload = false,
}: {
  activity: Activity;
  preload?: boolean;
}) {
  return (
    <Link className="card" href={`/activities/${activity.slug}`}>
      <Image
        src={activity.cardImage}
        alt={activity.tagline}
        fill
        sizes="(max-width: 900px) 100vw, 33vw"
        preload={preload}
      />
      <div className="cap">
        <span className="num">{activity.kicker}</span>
        <h3>{activity.title}</h3>
        <p>{activity.description}</p>
      </div>
    </Link>
  );
}
