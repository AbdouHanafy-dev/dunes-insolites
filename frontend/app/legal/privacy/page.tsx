import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${site.legalName} collects, uses, and stores your personal data.`,
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHead eyebrow="Legal" title="Privacy policy" lead="Last updated 16 August 2026." />

      <section className="section-sand">
        <div className="wrap">
          <div className="prose">
            <h2>What we collect</h2>
            <p>
              When you book a trip we collect your name, email address, phone number, party size,
              chosen date and departure, and any pickup or dietary notes you give us. If you join
              the newsletter we store only your email address.
            </p>
            <p>
              Our servers log standard technical data — IP address, browser, and the pages you
              visited — for security and to keep the site working.
            </p>

            <h2>Why we use it</h2>
            <ul>
              <li>To confirm, run, and if necessary reschedule your trip.</li>
              <li>To reach you if the weather forces a change.</li>
              <li>To meet our legal and accounting obligations in Tunisia.</li>
              <li>To send occasional trip news, only if you asked for it.</li>
            </ul>

            <h2>Who sees it</h2>
            <p>
              Your guide sees the details needed to run your trip. Beyond that we share data only
              with the providers that host our site, send our email, and process payments, and only
              as much as each needs. We never sell your data.
            </p>

            <h2>How long we keep it</h2>
            <p>
              Booking records are kept for seven years, as Tunisian accounting law requires.
              Newsletter subscriptions are kept until you unsubscribe, which every email lets you do
              in one click.
            </p>

            <h2>Your rights</h2>
            <p>
              You can ask us for a copy of your data, ask us to correct it, or ask us to delete
              anything we are not legally required to keep. Write to{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a> and we will answer within 30 days.
            </p>

            <h2>Cookies</h2>
            <p>
              We use a single functional cookie to remember your cookie choice. We do not run
              advertising trackers. If we add analytics we will ask first.
            </p>

            <h2>Contact</h2>
            <p>
              {site.legalName}, {site.address}. Email{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a>, phone {site.phone}.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
