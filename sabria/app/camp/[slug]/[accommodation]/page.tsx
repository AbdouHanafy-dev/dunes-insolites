import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActivities, getStay } from "@/lib/api";
import { getStays } from "@/lib/data/stays";
import StayReservationForm from "@/components/StayReservationForm";

type Props = { params: Promise<{ slug: string; accommodation: string }> };

async function getAccommodation(params: Props["params"]) {
  const { slug, accommodation: accommodationSlug } = await params;
  const stay = await getStay(slug);
  const accommodation = stay?.accommodations?.find((item) => item.slug === accommodationSlug);
  return { stay, accommodation };
}

export function generateStaticParams() {
  return getStays().flatMap((stay) =>
    (stay.accommodations ?? []).map((accommodation) => ({ slug: stay.slug, accommodation: accommodation.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stay, accommodation } = await getAccommodation(params);
  if (!stay || !accommodation) return { title: "Not found" };
  return {
    title: `${accommodation.title} at ${stay.title}`,
    description: accommodation.description,
    alternates: { canonical: `/camp/${stay.slug}/${accommodation.slug}` },
    openGraph: { images: [{ url: accommodation.image, width: 1200, height: 630, alt: accommodation.title }] },
  };
}

export default async function AccommodationDetail({ params }: Props) {
  const { stay, accommodation } = await getAccommodation(params);
  if (!stay || !accommodation) notFound();
  const activities = await getActivities();

  return (
    <>
      <section className="accommodation-hero">
        <Image src={accommodation.image} alt={accommodation.title} fill sizes="100vw" preload style={{ objectFit: "cover" }} />
        <div className="wrap">
          <Link href={`/camp/${stay.slug}`} className="back-link">← Back to {stay.title}</Link>
          <p className="kicker">Dunes Insolites accommodation</p>
          <h1>{accommodation.title}</h1>
          <p>{accommodation.tagline}</p>
        </div>
      </section>
      <section className="detail-body">
        <div className="wrap detail-grid">
          <div className="prose accommodation-detail-copy">
            <p className="sect-eyebrow">The details</p>
            <h2>A night that fits your pace.</h2>
            <p>{accommodation.description}</p>
            <ul className="feature-list">
              {accommodation.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </div>
          <aside className="book-panel" id="reserve">
            <div className="price"><span className="v">€{accommodation.priceFrom}</span><span className="u">per night</span></div>
            <div className="rows"><div className="row"><span className="k">Sleeps</span><span className="v">{accommodation.sleeps}</span></div><div className="row"><span className="k">Location</span><span className="v">Sabria camp</span></div></div>
            <StayReservationForm stay={stay} activities={activities} accommodationSlug={accommodation.slug} accommodationPrice={accommodation.priceFrom} />
          </aside>
        </div>
      </section>
    </>
  );
}
