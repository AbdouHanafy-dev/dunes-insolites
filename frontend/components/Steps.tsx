import Reveal from "@/components/Reveal";

const steps = [
  {
    n: "01",
    title: "Pick your adventure",
    body: "Choose a single activity or bundle camel, quad, and board into one sunset expedition.",
  },
  {
    n: "02",
    title: "Book your window",
    body: "Reserve a morning or golden-hour slot. Gear, guides, and transfers are all included.",
  },
  {
    n: "03",
    title: "Meet at the gate",
    body: "Arrive at the Sabria gate, meet your guide, and head out across the open Sahara.",
  },
];

export default function Steps() {
  return (
    <section className="block steps" id="steps">
      <div className="wrap">
        <Reveal>
          <p className="sect-eyebrow">How it works</p>
          <h2 className="sect-title">
            From booking
            <br />
            to the dunes.
          </h2>
        </Reveal>
        <div className="grid">
          {steps.map((s, i) => (
            <Reveal key={s.n} className="step" delay={i * 90}>
              <div className="n">{s.n}</div>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
