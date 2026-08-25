import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStay } from "@/lib/api";
import { getStays } from "@/lib/data/stays";

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
        <div className="wrap">
          <div className="prose accommodation-detail-copy" style={{ maxWidth: 720, margin: "0 auto" }}>
            <p className="sect-eyebrow">The details</p>
            <h2>A night that fits your pace.</h2>
            <p>{accommodation.description}</p>
            <ul className="feature-list">
              {accommodation.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <p style={{ marginTop: 32 }}>
              <strong>From €{accommodation.priceFrom} per night · {accommodation.sleeps}</strong>
            </p>
          </div>
          <div style={{ maxWidth: 720, margin: "24px auto 0", textAlign: "center" }}>
            <Link
              href={`/camp/${stay.slug}?accommodation=${accommodation.slug}#reserve`}
              className="btn-accent"
            >
              Reserve this stay →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
