import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";

export const metadata: Metadata = {
  title: "Safety",
  description:
    "How Dunes Insolites keeps desert trips safe: guide ratios, equipment checks, heat protocol, medical cover, and what to bring.",
  alternates: { canonical: "/safety" },
};

const faqs = [
  {
    q: "Do I need experience to ride a quad?",
    a: "No. The quads are automatic and every session starts with a briefing and a practice lap on the flat before we head into the dunes. Riders must be 16 or older and carry ID.",
  },
  {
    q: "Is the camel trek suitable for children?",
    a: "Children from six can ride with a parent, and handlers walk beside every camel for the whole route. Below six we recommend the sunset camp visit instead — same tea, no saddle.",
  },
  {
    q: "What happens if the weather turns?",
    a: "Sandstorms and high wind mean we cancel, and you get a full refund or a free reschedule. That call is made by the lead guide, never by the booking desk.",
  },
  {
    q: "What should I wear?",
    a: "Closed shoes, long sleeves, and sunglasses. We hand out a chèche for your head and neck at the gate. Skip anything you would be upset to get sand into.",
  },
  {
    q: "Is there phone signal out there?",
    a: "Patchy. Every guide carries a satellite messenger and a charged radio, and the base at the gate knows every route and expected return time.",
  },
  {
    q: "Can you handle dietary or medical needs?",
    a: "Yes — tell us when you book. We cater vegetarian, vegan, and gluten-free at the camp, and our guides are briefed on any condition you share with us.",
  },
];

export default function SafetyPage() {
  return (
    <>
      <PageHead
        eyebrow="Before you ride"
        title="Safety in the sand."
        lead="The Sahara is forgiving if you respect it and unforgiving if you don't. Here is exactly how we run our trips."
        image="/images/quad.jpg"
      />

      <section className="section-sand">
        <div className="wrap">
          <Reveal className="prose">
            <h2>On every trip</h2>
            <ul>
              <li>A licensed lead guide, plus a sweep guide on any group of six or more.</li>
              <li>Radio contact with the gate base and a satellite messenger per group.</li>
              <li>A first-aid kit, shade sheet, and twice the water we expect anyone to drink.</li>
              <li>Helmets, goggles, and gloves issued and checked for every quad rider.</li>
              <li>Boards, bindings, and saddles inspected between every session.</li>
            </ul>

            <h2>Heat protocol</h2>
            <p>
              From June to September we run only the early morning and the last hour before sunset.
              If the forecast at the gate reads above 44°C we stand the day down and everyone is
              refunded or rebooked, no questions and no fee.
            </p>

            <h2>Insurance and medical</h2>
            <p>
              We carry public liability cover for all guided activity. That does not replace your
              own travel insurance — check that yours covers quad riding and sandboarding, since
              some policies class them as extreme sports.
            </p>
            <p>
              The nearest hospital is in Douz, twelve minutes from the gate. Every vehicle in our
              fleet can reach it directly from anywhere on our routes.
            </p>

            <h2>What to bring</h2>
            <ul>
              <li>Closed shoes you don&apos;t mind filling with sand</li>
              <li>Long sleeves and long trousers — sun, not modesty</li>
              <li>Sunglasses and high-factor sunscreen</li>
              <li>A layer for after dark; the desert drops fast once the sun is down</li>
              <li>Cash for tips if you want to; cards work at the gate for everything else</li>
            </ul>
          </Reveal>

          <Reveal>
            <div className="faq">
              <p className="sect-eyebrow">Common questions</p>
              <h2 className="sect-title" style={{ fontSize: "clamp(28px,3.4vw,46px)", marginBottom: 28 }}>
                Asked at the gate.
              </h2>
              {faqs.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <CTA
        title="Still have a question?"
        body="Ask us anything before you book — we answer within a day, usually the same hour."
        href="/contact"
        label="Talk to us →"
      />
    </>
  );
}
