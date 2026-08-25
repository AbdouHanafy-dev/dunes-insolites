import type { Metadata } from "next";
import { getStays } from "@/lib/api";
import StayCard from "@/components/StayCard";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";

export const metadata: Metadata = {
  title: "Stay",
  description:
    "A night at the Sabria camp, or a simpler bivouac deeper in the dunes — reserve a nuitée, with camel, quad, or sandboarding added on if you want them.",
  alternates: { canonical: "/camp" },
};

export default async function CampPage() {
  const stays = await getStays();

  return (
    <>
      <PageHead
        eyebrow="Choose your night"
        title={
          <>
            Two ways to sleep
            <br />
            in the dunes.
          </>
        }
        lead="The fixed camp, or a bivouac further out — pick a night, then add camel, quad, or sandboarding if you want them. We confirm timing once you're on-site."
        image="/images/under-hero.jpg"
      />

      <section className="block activities" style={{ paddingTop: 110 }}>
        <div className="wrap">
          <div className="cards cols-2">
            {stays.map((stay, i) => (
              <Reveal key={stay.slug} delay={i * 90}>
                <StayCard stay={stay} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CTA
        title="Not sure which one?"
        body="Tell us how many of you there are and what you'd like to do — we'll suggest the right night."
        href="/contact"
        label="Ask us →"
      />
    </>
  );
}
