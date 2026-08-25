import type { Metadata } from "next";
import { getActivities } from "@/lib/api";
import { formatDuration } from "@/lib/data/activities";
import ActivityCard from "@/components/ActivityCard";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import Steps from "@/components/Steps";
import BookDirect from "@/components/BookDirect";
import CTA from "@/components/CTA";

export const metadata: Metadata = {
  title: "Experiences",
  description:
    "Camel treks, quad safaris, and sandboarding in the Sabria dunes. Compare our three Sahara adventures and book a morning or golden-hour slot.",
  alternates: { canonical: "/activities" },
};

export default async function ActivitiesPage() {
  const activities = await getActivities();

  return (
    <>
      <PageHead
        eyebrow="Choose your ride"
        title={
          <>
            Three ways
            <br />
            to cross the sand.
          </>
        }
        lead="Each one runs twice a day — once before the heat, once as the light turns. Gear, guides, and transfers are included in every price below."
        image="/images/hero-combined.jpg"
      />

      <section className="block activities" style={{ paddingTop: 110 }}>
        <div className="wrap">
          <div className="cards">
            {activities.map((activity, i) => (
              <Reveal key={activity.slug} delay={i * 90}>
                <ActivityCard activity={activity} preload={i === 0} />
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div style={{ marginTop: 72 }}>
              <p className="sect-eyebrow">Side by side</p>
              <h2 className="sect-title" style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>
                Which one suits you?
              </h2>
              <div className="include-grid cols-3">
                {activities.map((a) => (
                  <div key={a.slug} className="prose" style={{ maxWidth: "none" }}>
                    <h3 style={{ marginTop: 0 }}>{a.title}</h3>
                    <ul>
                      <li>From €{a.priceFrom} per person</li>
                      <li>{formatDuration(a.durationMins)} on the sand</li>
                      <li>{a.difficulty} · {a.groupSize}</li>
                      <li>{a.slots.length === 2 ? "Morning & golden hour" : "Golden hour only"}</li>
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <BookDirect />
      <Steps />
      <CTA />
    </>
  );
}
