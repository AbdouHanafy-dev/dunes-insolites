import Link from "next/link";
import Reveal from "@/components/Reveal";

/**
 * The commercial reason this site exists: booking here costs the business
 * nothing in commission, so the guest can be given part of that back.
 *
 * The `DIRECT_DISCOUNT` figure below is a business decision, not a design one
 * — set it to whatever margin is actually being passed on, and make sure the
 * prices in lib/data/activities.ts reflect it. Claiming a saving that isn't
 * real is a misleading-pricing problem, not a copy problem.
 */
const DIRECT_DISCOUNT = "15%";

const here = [
  "Best price — no platform commission on top",
  "Talk to the guide who runs your trip, not a call centre",
  "Free cancellation up to 24 hours before",
  "Pay at the gate — nothing charged to book",
  "Flexible pickup from your hotel in Douz or Kebili",
  "Your photos and video sent the next morning",
];

const there = [
  "Platform adds its commission to the price",
  "Messages go through the platform's support desk",
  "Cancellation terms set by the platform",
  "Card charged at the time of booking",
  "Fixed meeting point only",
  "No photos included",
];

export default function BookDirect() {
  return (
    <section className="block direct" id="book-direct">
      <div className="wrap">
        <Reveal>
          <p className="sect-eyebrow">Book direct</p>
          <h2 className="sect-title" style={{ fontSize: "clamp(32px,4.4vw,64px)" }}>
            Same dunes.
            <br />
            {DIRECT_DISCOUNT} less.
          </h2>
          <p className="lead">
            We run every trip on this page ourselves. Booking here means no platform takes a cut —
            so the saving goes to you, and your questions come straight to the people who will be
            standing at the gate.
          </p>
        </Reveal>

        <Reveal>
          <div className="compare">
            <div className="col here">
              <span className="tag">Booking here</span>
              <h3>Direct with Dunes Insolites</h3>
              <ul>
                {here.map((t) => (
                  <li key={t}>
                    <span className="mark yes" aria-hidden="true">
                      ✓
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col">
              <span className="tag" style={{ color: "rgba(253,241,225,.5)" }}>
                Booking elsewhere
              </span>
              <h3>Through a booking platform</h3>
              <ul>
                {there.map((t) => (
                  <li key={t}>
                    <span className="mark no" aria-hidden="true">
                      ·
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 48 }}>
            <Link href="/book" className="btn-accent">
              Book direct now
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
