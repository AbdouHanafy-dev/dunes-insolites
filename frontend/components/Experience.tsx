import Image from "next/image";
import Reveal from "@/components/Reveal";
import { getStats } from "@/lib/api";

export default async function Experience() {
  const stats = await getStats();

  return (
    <section className="block exp" id="experience">
      <div className="bg">
        <Image
          src="/images/hero-combined.jpg"
          alt="Sabria desert scene"
          fill
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      </div>
      <Reveal className="wrap">
        <h2 className="serif">The desert, the way it was meant to be felt.</h2>
        <p>
          Small groups, local guides, and no rush. Every Sabria trip is timed so the sand still
          holds the day&apos;s warmth and the sky is on fire.
        </p>
        <div className="stats">
          <div className="stat">
            <div className="v serif">{stats.guestsGuided}</div>
            <div className="k">Guests guided</div>
          </div>
          <div className="stat">
            <div className="v serif">{stats.avgRating}</div>
            <div className="k">Average rating</div>
          </div>
          <div className="stat">
            <div className="v serif">{stats.yearsRunning}</div>
            <div className="k">On the dunes</div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
