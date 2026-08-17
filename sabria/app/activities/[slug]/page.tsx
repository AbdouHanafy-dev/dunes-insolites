import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActivity, getRelatedActivities, getReviews } from "@/lib/api";
import { formatDuration, getActivities as seedActivities } from "@/lib/data/activities";
import { averageRating } from "@/lib/data/reviews";
import ActivityCard from "@/components/ActivityCard";
import Reveal from "@/components/Reveal";
import Reviews from "@/components/Reviews";
import CTA from "@/components/CTA";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return seedActivities().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const activity = await getActivity(slug);
  if (!activity) return { title: "Not found" };

  return {
    title: activity.title,
    description: activity.tagline,
    alternates: { canonical: `/activities/${activity.slug}` },
    openGraph: {
      title: `${activity.title} — ${site.name}`,
      description: activity.tagline,
      images: [{ url: activity.heroImage, width: 1200, height: 630, alt: activity.title }],
    },
  };
}

export default async function ActivityDetail({ params }: Props) {
  const { slug } = await params;
  const activity = await getActivity(slug);
  if (!activity) notFound();

  const [related, activityReviews] = await Promise.all([
    getRelatedActivities(slug),
    getReviews(slug),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: activity.title,
    description: activity.tagline,
    image: `${site.url}${activity.heroImage}`,
    offers: {
      "@type": "Offer",
      price: activity.priceFrom,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    // Rich-result star ratings in Google. Only emitted when reviews exist —
    // aggregateRating with no reviews behind it is a manual-action risk.
    ...(activityReviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating(activityReviews),
            reviewCount: activityReviews.length,
          },
        }
      : {}),
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
            src={activity.heroImage}
            alt={activity.title}
            fill
            sizes="100vw"
            preload
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="wrap">
          <p className="kicker">{activity.kicker}</p>
          <h1>{activity.title}</h1>
          <p className="tagline">{activity.tagline}</p>
          <div className="facts">
            <span className="fact">From €{activity.priceFrom}</span>
            <span className="fact">{formatDuration(activity.durationMins)}</span>
            <span className="fact">{activity.difficulty}</span>
            <span className="fact">{activity.groupSize}</span>
          </div>
        </div>
      </section>

      <section className="detail-body">
        <div className="wrap">
          <div className="detail-grid">
            <div>
              <Reveal className="prose">
                <h2>The trip</h2>
                {activity.longDescription.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </Reveal>

              <Reveal>
                <div className="include-grid">
                  <div className="prose" style={{ maxWidth: "none" }}>
                    <h3 style={{ marginTop: 0 }}>What&apos;s included</h3>
                    <ul>
                      {activity.included.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="prose" style={{ maxWidth: "none" }}>
                    <h3 style={{ marginTop: 0 }}>Not included</h3>
                    <ul>
                      {activity.notIncluded.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>

              <Reveal className="prose">
                <h2>Meeting point</h2>
                <p>{activity.meetingPoint}</p>
                <p>
                  Free pickup from hotels in Douz and Kebili — tell us where you&apos;re staying when
                  you book and we&apos;ll confirm a time.
                </p>
              </Reveal>

              <Reveal>
                <div className="detail-gallery">
                  {activity.gallery.map((src, i) => (
                    <div key={`${src}-${i}`} className="g">
                      <Image
                        src={src}
                        alt={`${activity.title} — photo ${i + 1}`}
                        fill
                        sizes="(max-width: 900px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            <aside className="book-panel">
              <div className="price">
                <span className="v">€{activity.priceFrom}</span>
                <span className="u">per person</span>
              </div>
              <div className="rows">
                <div className="row">
                  <span className="k">Duration</span>
                  <span className="v">{formatDuration(activity.durationMins)}</span>
                </div>
                <div className="row">
                  <span className="k">Difficulty</span>
                  <span className="v">{activity.difficulty}</span>
                </div>
                <div className="row">
                  <span className="k">Group size</span>
                  <span className="v">{activity.groupSize}</span>
                </div>
                <div className="row">
                  <span className="k">Departures</span>
                  <span className="v">Morning · Golden hour</span>
                </div>
              </div>
              <Link href={`/book?activity=${activity.slug}`} className="btn-accent">
                Book this trip
              </Link>
              <p className="note">Free cancellation up to 24 hours before.</p>
            </aside>
          </div>

          <div style={{ marginTop: 110 }}>
            <Reveal>
              <p className="sect-eyebrow">Also on the sand</p>
              <h2 className="sect-title" style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>
                Make it a full day.
              </h2>
            </Reveal>
            <div className="cards cols-2">
              {related.map((a, i) => (
                <Reveal key={a.slug} delay={i * 90}>
                  <ActivityCard activity={a} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Reviews activitySlug={slug} title={`What guests say about the ${activity.title.toLowerCase()}.`} />

      <CTA
        title="Save your seat."
        body={`${activity.title} runs twice daily and golden-hour slots go first.`}
        href={`/book?activity=${activity.slug}`}
        label={`Book ${activity.title} →`}
      />
    </>
  );
}
