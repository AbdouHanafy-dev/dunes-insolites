import { getActivities } from "@/lib/api";
import ActivityCard from "@/components/ActivityCard";
import Reveal from "@/components/Reveal";

export default async function Activities() {
  const activities = await getActivities();

  return (
    <section className="block activities" id="activities">
      <div className="wrap">
        <Reveal className="head">
          <p className="sect-eyebrow">Choose your ride</p>
          <h2 className="sect-title">
            Three ways
            <br />
            to cross the sand.
          </h2>
          <p>
            From the slow sway of a camel at golden hour to the roar of a quad over the dunes —
            every Sabria trip ends the same way, watching the sun drop behind the Sahara.
          </p>
        </Reveal>
        <div className="cards">
          {activities.map((activity, i) => (
            <Reveal key={activity.slug} delay={i * 90}>
              <ActivityCard activity={activity} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
