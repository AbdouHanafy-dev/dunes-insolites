import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: `Booking terms, cancellation policy, and conditions of participation for ${site.legalName}.`,
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHead eyebrow="Legal" title="Terms & conditions" lead="Last updated 16 August 2026." />

      <section className="section-sand">
        <div className="wrap">
          <div className="prose">
            <h2>Booking</h2>
            <p>
              A booking is a request until we confirm it by email with a reference number. Prices
              are per person in euros and include guiding, equipment, and transfers from Douz and
              Kebili unless stated otherwise on the trip page.
            </p>

            <h2>Payment</h2>
            <p>
              Nothing is charged when you book. We take payment at the gate before departure, or by
              secure link if you prefer to settle in advance. Cash in dinar and cards are both
              accepted.
            </p>

            <h2>Cancellation</h2>
            <ul>
              <li>Cancel more than 24 hours before departure: no charge.</li>
              <li>Cancel within 24 hours: 50% of the trip price.</li>
              <li>No-show at the gate: full price.</li>
              <li>
                If we cancel — weather, equipment, or anything else on our side — you choose a full
                refund or a free reschedule.
              </li>
            </ul>

            <h2>Participation</h2>
            <p>
              Quad riders must be 16 or older and carry photo ID. Camel riders under six must ride
              with an adult. Tell us at booking about any medical condition, pregnancy, or mobility
              need so we can put you on the right trip — we would rather move you than turn you away
              at the gate.
            </p>
            <p>
              Our guides may refuse or stop participation for anyone under the influence of alcohol
              or drugs, or anyone who ignores a safety instruction. No refund is due in that case.
            </p>

            <h2>Risk</h2>
            <p>
              Desert activities carry inherent risk. We manage it with briefings, equipment checks,
              and trained guides, but we cannot remove it. You take part at your own risk and are
              responsible for holding travel insurance that covers these activities.
            </p>

            <h2>Liability</h2>
            <p>
              We carry public liability insurance for guided activity. Nothing in these terms limits
              our liability for death or personal injury caused by our negligence. Otherwise our
              liability is limited to the price of the trip.
            </p>

            <h2>Photography</h2>
            <p>
              Guides photograph and film trips and send you the results. We also sometimes use those
              images publicly — tell your guide at the gate if you would rather we didn&apos;t, and
              we won&apos;t.
            </p>

            <h2>Law</h2>
            <p>
              These terms are governed by Tunisian law. Complaints go to{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a> and we will answer within 14 days.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
