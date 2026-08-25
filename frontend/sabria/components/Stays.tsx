import { getStays } from "@/lib/api";
import StayCard from "@/components/StayCard";
import Reveal from "@/components/Reveal";

export default async function Stays() {
  const stays = await getStays();

  return (
    <section className="block stays" id="stays">
      <div className="wrap">
        <Reveal className="head">
          <p className="sect-eyebrow">Choose your night</p>
          <h2 className="sect-title">
            Two ways
            <br />
            to sleep in the dunes.
          </h2>
          <p>
            The fixed camp, or a bivouac further into the dunes — both end the same way, at a fire
            circle, under the same sky.
          </p>
        </Reveal>
        <div className="cards cols-2">
          {stays.map((stay, i) => (
            <Reveal key={stay.slug} delay={i * 90}>
              <StayCard stay={stay} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
