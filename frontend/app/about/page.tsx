import type { Metadata } from "next";
import Image from "next/image";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import Experience from "@/components/Experience";
import CTA from "@/components/CTA";

export const metadata: Metadata = {
  title: "About",
  description:
    "Dunes Insolites is a family-run desert outfit in Sabria, southern Tunisia. Meet the guides who take you across the sand.",
  alternates: { canonical: "/about" },
};

const guides = [
  {
    name: "Hédi Ben Amor",
    role: "Founder · Head guide",
    photo: "/images/camel.jpg",
    bio: "Born in Sabria, raised on the dune belt. Hédi started with two camels and a pot of tea in 2018 and still leads the golden-hour caravan most evenings.",
  },
  {
    name: "Yasmine Trabelsi",
    role: "Quad lead · Safety",
    photo: "/images/quad.jpg",
    bio: "Former rally mechanic. Yasmine sets every route in the sand sea, briefs every rider, and keeps the fleet in better shape than most road cars.",
  },
  {
    name: "Karim Saïdi",
    role: "Board instructor",
    photo: "/images/sandboard.jpg",
    bio: "Snowboarder turned dune rider. Karim can have someone who has never stood on a board carving a face inside ten minutes, and he films the proof.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHead
        eyebrow="Who we are"
        title={
          <>
            A family outfit
            <br />
            at the edge of the sand.
          </>
        }
        lead="Dunes Insolites runs out of Sabria, a village on the last road before the Grand Erg Oriental. Everyone who guides for us grew up within sight of these dunes."
        image="/images/gate.jpg"
      />

      <section className="section-sand">
        <div className="wrap">
          <Reveal className="prose">
            <h2>Why we started</h2>
            <p>
              Most desert trips in Tunisia are sold by the busload — forty people, one camel line,
              twenty minutes, back on the coach. We wanted the opposite: small groups, local guides,
              and enough time on the sand that the desert stops being a photo stop and starts being
              a place.
            </p>
            <p>
              So we run a maximum of twelve guests per departure, twice a day, from a gate ten
              minutes south of Douz. Every trip is timed around the light — out before the heat, or
              out as the sun starts to drop.
            </p>

            <h2>How we work</h2>
            <ul>
              <li>Every guide is from Sabria, Douz, or Kebili, and paid year-round, not per trip.</li>
              <li>Groups cap at twelve, and we never merge two bookings to fill a departure.</li>
              <li>Camels work a maximum of two trips a day and rest the whole summer.</li>
              <li>We carry out everything we carry in — the camps leave no trace by morning.</li>
              <li>A share of every booking funds the Sabria school&apos;s water tank.</li>
            </ul>
          </Reveal>

          <Reveal>
            <div id="guides" style={{ marginTop: 96, scrollMarginTop: 120 }}>
              <p className="sect-eyebrow">The people</p>
              <h2 className="sect-title" style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>
                Your guides.
              </h2>
              <div className="team">
                {guides.map((g) => (
                  <div key={g.name} className="member">
                    <div className="photo">
                      <Image
                        src={g.photo}
                        alt={g.name}
                        fill
                        sizes="(max-width: 900px) 50vw, 33vw"
                      />
                    </div>
                    <h3>{g.name}</h3>
                    <div className="role">{g.role}</div>
                    <p className="bio">{g.bio}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Experience />
      <CTA />
    </>
  );
}
