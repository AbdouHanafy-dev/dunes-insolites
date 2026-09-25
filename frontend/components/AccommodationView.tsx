import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";
import AccIcon from "@/components/AccIcon";
import AccGallery from "@/components/AccGallery";
import ReviewCard from "@/components/ReviewCard";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import { getSiteImages } from "@/lib/api";
import { site } from "@/lib/site";
import type { Accommodation, Review, Stay } from "@/lib/types";

const KNOWN_TYPES = ["desert-tent", "desert-room", "dune-suite"];
const typeKey = (slug: string) => (KNOWN_TYPES.includes(slug) ? slug : "default");

const TRUST_ICONS = ["shield", "home", "hand", "chat"];

type QuickItem = { icon: string; label: string };
type TypeCopy = {
  eyebrow: string;
  tagline: string;
  highlights: string[];
  quick: QuickItem[];
  about: string[];
  bathroomText: string;
  comfort: string[];
  forWhom: { title: string; text: string }[];
  faq: { q: string; a: string }[];
  compare: Record<"experience" | "bathroom" | "ac" | "privacy" | "recommended", string>;
};

/**
 * The detail page of one camp accommodation (tent / room / suite): fourteen
 * sections from the hero to the booking call to action. Every accommodation
 * shares the layout; the wording that differs (bathroom, air conditioning,
 * who it suits) comes from `accDetail.types.<slug>`. Price, capacity and
 * photos come from the catalogue, so they stay editable in the admin.
 */
export default async function AccommodationView({
  stay,
  accommodation,
  locale,
  reviews,
  whatsapp,
}: {
  stay: Stay;
  accommodation: Accommodation;
  locale: string;
  reviews: Review[];
  whatsapp: string;
}) {
  const [t, tShow, images] = await Promise.all([
    getTranslations("accDetail"),
    getTranslations("reviewsShowcase"),
    getSiteImages(),
  ]);
  // Photos that are not the accommodation's own are replaceable slots
  // ("Photos du site" in the back office).
  const FILLER = [images["gallery.1"], images["gallery.2"], images["gallery.3"], images["gallery.4"], images["gallery.5"]];
  const ACTIVITY_PHOTO: Record<string, string> = {
    camel: images["activity.camel"],
    quad: images["activity.quad"],
    fourx4: images["activity.fourx4"],
    board: images["activity.sandboarding"],
  };
  const copy = t.raw(`types.${typeKey(accommodation.slug)}`) as TypeCopy;
  const included = t.raw("included.items") as { icon: string; text: string }[];
  const facilities = t.raw("campFacilities") as string[];
  const activities = t.raw("activities.items") as { title: string; text: string; cta: string; photo: string; included?: boolean }[];
  const steps = t.raw("timeline.steps") as { time: string; text: string }[];
  const faq = [...copy.faq, ...(t.raw("important.common") as { q: string; a: string }[])];
  const trust = t.raw("trust") as string[];
  const locationPoints = t.raw("location.points") as string[];
  const rowLabels = t.raw("compare.rows") as Record<string, string>;

  const bookHref = `/camp/${stay.slug}?accommodation=${accommodation.slug}#reserve`;
  const waDigits = whatsapp.replace(/[^\d]/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}` : "/contact";

  // Gallery: this accommodation's own photos only; the site's library photos
  // stand in just when none was uploaded.
  const own = [...new Set([accommodation.image, ...(accommodation.gallery ?? [])].filter(isDisplayableImageSrc))];
  const photos = own.length > 0 ? own : FILLER.slice(0, 5);

  const quick = copy.quick.map((q) => (q.icon === "users" ? { ...q, label: accommodation.sleeps } : q));
  const topReviews = [...reviews].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${site.coords.lng - 0.35}%2C${
    site.coords.lat - 0.25
  }%2C${site.coords.lng + 0.35}%2C${site.coords.lat + 0.25}&layer=mapnik&marker=${site.coords.lat}%2C${site.coords.lng}`;

  const others = stay.accommodations ?? [];

  return (
    <div className="acc">
      {/* 1 — Hero */}
      <section className="acc-hero">
        {isDisplayableImageSrc(accommodation.image) && (
          <Image src={accommodation.image} alt="" fill priority sizes="100vw" className="acc-hero-img" />
        )}
        <div className="acc-hero-shade" />
        <div className="wrap acc-hero-inner">
          <Link href="/camp" className="acc-back">{t("ui.back")}</Link>
          <p className="acc-eyebrow acc-eyebrow--light">{copy.eyebrow}</p>
          <h1>{accommodation.title}</h1>
          <p className="acc-hero-lead">{copy.tagline || accommodation.tagline}</p>
          <p className="acc-hero-price">
            <span>{t("ui.from")}</span> <strong>{accommodation.priceFrom} €</strong> <span>{t("ui.perNight")}</span>
          </p>
          <ul className="acc-highlights">
            {copy.highlights.map((h) => (
              <li key={h}>
                <AccIcon name="check" size={18} /> {h}
              </li>
            ))}
          </ul>
          <div className="acc-actions">
            <Link href={bookHref} className="acc-btn acc-btn--terracotta">{t("ui.bookNow")} →</Link>
            <a href="#photos" className="acc-btn acc-btn--ghost">{t("ui.viewPhotos")}</a>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <ul className="acc-trust wrap">
        {trust.map((label, i) => (
          <li key={label}>
            <AccIcon name={TRUST_ICONS[i] ?? "check"} size={20} /> {label}
          </li>
        ))}
      </ul>

      {/* 2 — Gallery */}
      <section className="acc-section acc-gallery-section" id="photos">
        <div className="wrap">
          <AccGallery
            photos={photos}
            title={accommodation.title}
            labels={{
              viewAll: t("ui.viewAllPhotos"),
              close: t("ui.close"),
              previous: t("ui.previous"),
              next: t("ui.next"),
              photoOf: t("ui.photoOf", { n: "{n}", total: "{total}" }),
            }}
          />
        </div>
      </section>

      {/* 3 — Quick information */}
      <section className="acc-quick">
        <ul className="wrap">
          {quick.map((q) => (
            <li key={q.icon + q.label}>
              <AccIcon name={q.icon} size={26} />
              <span>{q.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 4 — About */}
      <section className="acc-section acc-about">
        <div className="wrap acc-narrow">
          <Reveal>
            <p className="acc-eyebrow">{t("ui.aboutEyebrow")}</p>
            <h2>{accommodation.title}</h2>
            {(copy.about.length ? copy.about : [accommodation.description]).map((p) => (
              <p key={p}>{p}</p>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 5 — Included */}
      <section className="acc-section acc-included">
        <div className="wrap">
          <Reveal className="acc-head">
            <p className="acc-eyebrow acc-eyebrow--amber">{t("included.eyebrow")}</p>
            <h2>{t("included.title")}</h2>
          </Reveal>
          <ul className="acc-included-grid">
            {included.map((item, i) => (
              <Reveal as="li" key={item.text} delay={(i % 5) * 60}>
                <AccIcon name={item.icon} size={28} />
                <span>{item.text}</span>
              </Reveal>
            ))}
          </ul>
          <p className="acc-note">{t("included.note")}</p>
        </div>
      </section>

      {/* 6 — Features */}
      <section className="acc-section">
        <div className="wrap">
          <Reveal className="acc-head">
            <p className="acc-eyebrow">{t("ui.featuresEyebrow")}</p>
            <h2>{t("ui.featuresTitle")}</h2>
          </Reveal>
          <div className="acc-features">
            <Reveal className="acc-feature">
              <h3>{t("ui.comfort")}</h3>
              <ul>{copy.comfort.map((c) => <li key={c}><AccIcon name="check" size={16} /> {c}</li>)}</ul>
            </Reveal>
            <Reveal className="acc-feature" delay={80}>
              <h3>{t("ui.bathroom")}</h3>
              <p>{copy.bathroomText}</p>
            </Reveal>
            <Reveal className="acc-feature" delay={160}>
              <h3>{t("ui.campFacilities")}</h3>
              <ul>{facilities.map((c) => <li key={c}><AccIcon name="check" size={16} /> {c}</li>)}</ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 7 — Optional activities */}
      <section className="acc-section acc-activities">
        <div className="wrap">
          <Reveal className="acc-head">
            <p className="acc-eyebrow">{t("activities.eyebrow")}</p>
            <h2>{t("activities.title")}</h2>
            <p>{t("activities.lead")}</p>
          </Reveal>
          <div className="acc-grid acc-grid--4">
            {activities.map((a, i) => (
              <Reveal key={a.title} delay={i * 80}>
                <Link href={a.included ? bookHref : "/contact"} className="acc-act">
                  <span className="acc-act-media">
                    <Image src={ACTIVITY_PHOTO[a.photo] ?? FILLER[0]} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" />
                    {a.included && <span className="acc-act-badge">{t("activities.included")}</span>}
                  </span>
                  <span className="acc-act-body">
                    <strong>{a.title}</strong>
                    <span>{a.text}</span>
                    <span className="acc-link acc-link--small">{a.cta} →</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 8 — Timeline */}
      <section className="acc-section acc-timeline-section">
        <div className="wrap acc-narrow">
          <Reveal className="acc-head">
            <p className="acc-eyebrow">{t("ui.timelineEyebrow")}</p>
            <h2>{t("timeline.title")}</h2>
          </Reveal>
          <ol className="acc-timeline">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.time} delay={(i % 4) * 60}>
                <span className="acc-time">{s.time}</span>
                <span>{s.text}</span>
              </Reveal>
            ))}
          </ol>
          <p className="acc-note">{t("timeline.note")}</p>
        </div>
      </section>

      {/* 9 — Who is it for */}
      <section className="acc-section acc-forwhom">
        <div className="wrap">
          <Reveal className="acc-head">
            <p className="acc-eyebrow">{t("ui.forWhomEyebrow")}</p>
            <h2>{accommodation.title}</h2>
          </Reveal>
          <div className="acc-grid acc-grid--4">
            {copy.forWhom.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="acc-info-card">
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 10 — Important to know */}
      <section className="acc-section">
        <div className="wrap acc-narrow">
          <Reveal className="acc-head">
            <p className="acc-eyebrow">{t("ui.importantEyebrow")}</p>
            <h2>{t("important.title")}</h2>
          </Reveal>
          <div className="acc-faq">
            {faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 11 — Comparison */}
      {others.length > 1 && (
        <section className="acc-section acc-compare">
          <div className="wrap">
            <Reveal className="acc-head">
              <p className="acc-eyebrow">{t("ui.compareEyebrow")}</p>
              <h2>{t("compare.title")}</h2>
              <p>{t("compare.lead")}</p>
            </Reveal>
            <Reveal>
              <div className="acc-table-wrap">
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th />
                      {others.map((o) => (
                        <th key={o.slug} className={o.slug === accommodation.slug ? "is-current" : undefined}>
                          {o.title}
                          {o.slug === accommodation.slug && <em>{t("ui.current")}</em>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(["experience", "bathroom", "ac", "privacy", "recommended"] as const).map((row) => (
                      <tr key={row}>
                        <th scope="row">{rowLabels[row]}</th>
                        {others.map((o) => {
                          const c = (t.raw(`types.${typeKey(o.slug)}.compare`) as TypeCopy["compare"])[row];
                          return <td key={o.slug} className={o.slug === accommodation.slug ? "is-current" : undefined}>{c}</td>;
                        })}
                      </tr>
                    ))}
                    <tr>
                      <th scope="row">{rowLabels.price}</th>
                      {others.map((o) => (
                        <td key={o.slug} className={o.slug === accommodation.slug ? "is-current" : undefined}>
                          <strong>{o.priceFrom} €</strong> <span className="acc-per">{t("ui.perNight")}</span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th />
                      {others.map((o) => (
                        <td key={o.slug} className={o.slug === accommodation.slug ? "is-current" : undefined}>
                          {o.slug === accommodation.slug ? (
                            <Link href={bookHref} className="acc-btn acc-btn--terracotta acc-btn--small">{t("ui.bookNow")}</Link>
                          ) : (
                            <Link href={`/camp/${stay.slug}/${o.slug}`} className="acc-btn acc-btn--outline acc-btn--small">
                              {t("ui.viewAccommodation")}
                            </Link>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* 12 — Reviews (real reviews only; the section is left out when there are none) */}
      {topReviews.length > 0 && (
        <section className="acc-section acc-reviews">
          <div className="wrap">
            <Reveal className="acc-head">
              <p className="acc-eyebrow">{t("ui.reviewsEyebrow")}</p>
              <h2>{t("reviews.title")}</h2>
            </Reveal>
            <div className="acc-grid acc-grid--3">
              {topReviews.map((r) => (
                <ReviewCard key={r.id} review={r} locale={locale} ownerReplyLabel={tShow("ownerReply")} />
              ))}
            </div>
            <p className="acc-more"><Link href="/#reviews" className="acc-link">{t("ui.seeMoreReviews")} →</Link></p>
          </div>
        </section>
      )}

      {/* 13 — Location */}
      <section className="acc-section acc-location">
        <div className="wrap acc-split">
          <Reveal>
            <p className="acc-eyebrow">{t("ui.locationEyebrow")}</p>
            <h2>{t("location.title")}</h2>
            <p>{t("location.text")}</p>
            <ul className="acc-points">
              {locationPoints.map((p) => (
                <li key={p}><AccIcon name="car" size={18} /> {p}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="acc-map" delay={100}>
            <iframe src={mapSrc} title={t("ui.map")} loading="lazy" />
          </Reveal>
        </div>
      </section>

      {/* 14 — Final booking call to action */}
      <section className="acc-final">
        <Image src={images["accommodation.final"]} alt="" fill sizes="100vw" className="acc-hero-img" />
        <div className="acc-hero-shade" />
        <Reveal className="wrap acc-final-inner">
          <h2>{t("final.title")}</h2>
          <p>{t("final.text")}</p>
          <p className="acc-final-price">
            {t("ui.from")} <strong>{accommodation.priceFrom} €</strong> {t("ui.perNight")} — {t("final.included")}
          </p>
          <div className="acc-actions acc-actions--center">
            <Link href={bookHref} className="acc-btn acc-btn--terracotta">{t("ui.checkAvailability")} →</Link>
            <a href={waHref} target="_blank" rel="noreferrer noopener" className="acc-btn acc-btn--ghost">{t("ui.whatsapp")}</a>
          </div>
        </Reveal>
      </section>

      {/* Sticky booking bar (phones only) */}
      <div className="acc-sticky">
        <span>{t("ui.stickyFrom", { price: accommodation.priceFrom })}</span>
        <Link href={bookHref} className="acc-btn acc-btn--terracotta acc-btn--small">{t("ui.bookNow")} →</Link>
      </div>
    </div>
  );
}
