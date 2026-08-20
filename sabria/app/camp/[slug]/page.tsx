import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getActivities, getStay, getRelatedStays } from "@/lib/api";
import { getStays as seedStays } from "@/lib/data/stays";
import StayCard from "@/components/StayCard";
import AccommodationCard from "@/components/AccommodationCard";
import StayReservationForm from "@/components/StayReservationForm";
import Reveal from "@/components/Reveal";
import CTA from "@/components/CTA";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return seedStays().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stay = await getStay(slug);
  if (!stay) return { title: "Not found" };

  return {
    title: stay.title,
    description: stay.tagline,
    alternates: { canonical: `/camp/${stay.slug}` },
    openGraph: {
      title: `${stay.title} — ${site.name}`,
      description: stay.tagline,
      images: [{ url: stay.image, width: 1200, height: 630, alt: stay.title }],
    },
  };
}

export default async function StayDetail({ params }: Props) {
  const { slug } = await params;
  const stay = await getStay(slug);
  if (!stay) notFound();

  const [related, activities] = await Promise.all([
    getRelatedStays(slug).then((r) => r.slice(0, 2)),
    getActivities(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: stay.title,
    description: stay.tagline,
    image: `${site.url}${stay.image}`,
    offers: {
      "@type": "Offer",
      price: stay.priceFrom,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="detail-hero">
        <div className="bg">
          <Image
            src={stay.image}
            alt={stay.title}
            fill
            sizes="100vw"
            preload
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="wrap">
          <p className="kicker">{stay.kicker}</p>
          <h1>{stay.title}</h1>
          <p className="tagline">{stay.tagline}</p>
          <div className="facts">
            <span className="fact">From €{stay.priceFrom}</span>
            <span className="fact">Check-in {stay.arrivalTime}</span>
            <span className="fact">Check-out {stay.departureTime}</span>
            <span className="fact">{stay.groupSize}</span>
          </div>
        </div>
      </section>

      <section className="detail-body">
        <div className="wrap">
          <div className="detail-grid">
            <div>
              <Reveal className="prose">
                <p className="sect-eyebrow">A desert night, thoughtfully paced</p>
                <h2>The experience</h2>
                {stay.longDescription.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </Reveal>

              {stay.accommodations && (
                <Reveal className="accommodation-section">
                  <p className="sect-eyebrow">Choose how you sleep</p>
                  <h2>Find your desert stay.</h2>
                  <p className="accommodation-lead">
                    Compare our tent, room, and suite, then open any option for full details before reserving.
                  </p>
                  <div className="accommodation-grid">
                    {stay.accommodations.map((accommodation) => (
                      <AccommodationCard
                        key={accommodation.slug}
                        staySlug={stay.slug}
                        accommodation={accommodation}
                      />
                    ))}
                  </div>
                </Reveal>
              )}

              <Reveal className="stay-programme">
                <div className="stay-programme-heading">
                  <p className="sect-eyebrow">Your evening, unhurried</p>
                  <h2>A night that unfolds with the desert.</h2>
                </div>
                <div className="stay-itinerary-layout">
                  <ol className="stay-timeline">
                    {stay.itinerary.map((item) => (
                      <li key={`${item.time}-${item.title}`}>
                        <span className="stay-stop" aria-hidden="true" />
                        <p className="stay-time">{item.time}</p>
                        <div>
                          <h3>{item.title}</h3>
                          <p>{item.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="stay-map">
                    <p className="stay-map-label">Your route</p>
                    <iframe
                      title="Dunes Insolites location in Sabria"
                      src="https://www.google.com/maps?q=Sabria%2C%20Tunisia&output=embed"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <a href="https://www.google.com/maps?q=Sabria%2C%20Tunisia" target="_blank" rel="noreferrer">
                      Open in Google Maps →
                    </a>
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div className="practical-card prose" style={{ maxWidth: "none", marginTop: 56 }}>
                  <p className="practical-eyebrow">Know before you go</p>
                  <h2>Everything you need to know</h2>
                  <div className="include-grid">
                    <div>
                      <h3 style={{ marginTop: 0 }}>What&apos;s included</h3>
                      <ul>
                        {stay.included.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 style={{ marginTop: 0 }}>Not included</h3>
                      <ul>
                        {stay.notIncluded.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <h3>Good to know</h3>
                  <ul>
                    {stay.practicalInfo.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              {stay.gallery.length > 0 && (
                <Reveal>
                  <div className="detail-gallery">
                    {stay.gallery.map((src, i) => (
                      <div key={`${src}-${i}`} className="g">
                        <Image
                          src={src}
                          alt={`${stay.title} — photo ${i + 1}`}
                          fill
                          sizes="(max-width: 900px) 50vw, 33vw"
                        />
                      </div>
                    ))}
                  </div>
                </Reveal>
              )}
            </div>

            <aside className="book-panel" id="reserve">
              <div className="price">
                <span className="v">€{stay.priceFrom}</span>
                <span className="u">per person, per night</span>
              </div>
              <div className="rows">
                <div className="row">
                  <span className="k">Group size</span>
                  <span className="v">{stay.groupSize}</span>
                </div>
                <div className="row">
                  <span className="k">Location</span>
                  <span className="v">Sabria camp</span>
                </div>
                <div className="row">
                  <span className="k">Stay</span>
                  <span className="v">1 night</span>
                </div>
              </div>
              <StayReservationForm stay={stay} activities={activities} />
            </aside>
          </div>

          <Reveal className="night-journal">
            <div className="night-journal-intro">
              <div>
                <p className="sect-eyebrow">From golden hour to first light</p>
                <h2>One night. Five beautiful chapters.</h2>
              </div>
              <p>
                There is no rush here. Follow the rhythm of the desert, from your first tea to the soft light of morning.
              </p>
            </div>
            <div className="night-journal-list">
              {stay.itinerary.map((item, index) => (
                <article className="night-chapter" key={`${item.time}-${item.title}`}>
                  <div className="night-chapter-top">
                    <span>0{index + 1}</span>
                    <p>{item.time}</p>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </Reveal>

          {related.length > 0 && (
            <div style={{ marginTop: 110 }}>
              <Reveal>
                <p className="sect-eyebrow">Also at the camp</p>
                <h2 className="sect-title" style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>
                  Other stays.
                </h2>
              </Reveal>
              <div className="cards cols-2">
                {related.map((s, i) => (
                  <Reveal key={s.slug} delay={i * 90}>
                    <StayCard stay={s} />
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <CTA
        title="Save your spot."
        body={`${stay.title} fills up fast in golden-hour season — reserve now, confirm later.`}
        href={`/camp/${stay.slug}#reserve`}
        label={`Reserve the ${stay.title.toLowerCase()} →`}
      />
    </>
  );
}
