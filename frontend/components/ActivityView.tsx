import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";
import AccIcon from "@/components/AccIcon";
import AccGallery from "@/components/AccGallery";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import { getSiteImages } from "@/lib/api";
import type { Activity, Stay } from "@/lib/types";

const KNOWN = ["quad-desert", "camel-trek", "sandboarding-desert"];
const typeKey = (slug: string) => (KNOWN.includes(slug) ? slug : "default");

const TRUST_ICONS = ["shield", "home", "hand", "chat"];
const BEST_SUNSET = ["quad-desert", "camel-trek"];

type TypeCopy = {
  eyebrow: string;
  h1: string;
  tagline: string;
  highlights: string[];
  quick: { icon: string; label: string }[];
  about: string[];
  optionsTitle: string;
  options: { name: string; price: string; text: string }[];
  optionCta: string;
  steps: string[];
  bestNote: string;
  forWhom: string[];
  safety: string[];
  faq: { q: string; a: string }[];
  final: { title: string; text: string; cta: string };
  hero: { cta: string };
  sticky: string;
};

/**
 * Detail page of one on-site activity (quad, camel ride, sandboarding):
 * fourteen sections, same visual language as the accommodation pages with a
 * few more dynamic touches (slanted hero edge, slow image drift). The
 * activity's own catalogue record drives the price and booking link; the
 * wording that differs per activity lives in `actDetail.types.<slug>`.
 */
export default async function ActivityView({
  activity,
  allActivities,
  stay,
  whatsapp,
}: {
  activity: Activity;
  allActivities: Activity[];
  stay: Stay | undefined;
  whatsapp: string;
}) {
  const [t, images] = await Promise.all([getTranslations("actDetail"), getSiteImages()]);
  // Each activity's fallback photo is a replaceable slot ("Photos du site").
  const OWN_PHOTO: Record<string, string> = {
    "quad-desert": images["activity.quad"],
    "camel-trek": images["activity.camel"],
    "sandboarding-desert": images["activity.sandboarding"],
  };
  const PHOTO: Record<string, string> = {
    quad: images["activity.quad"],
    camel: images["activity.camel"],
    board: images["activity.sandboarding"],
    fourx4: images["activity.fourx4"],
  };
  const FILLER = [images["gallery.1"], images["gallery.2"], images["gallery.3"], images["gallery.4"], images["gallery.5"]];
  const key = typeKey(activity.slug);
  const copy = t.raw(`types.${key}`) as TypeCopy;
  const trust = t.raw("trust") as string[];
  const bring = t.raw("bring.items") as { icon: string; text: string }[];
  const faq = [...copy.faq, ...(t.raw("faqCommon") as { q: string; a: string }[])];
  const othersMap = t.raw("others.items") as Record<string, { title: string; text: string; photo: string }>;

  const isFree = activity.priceFrom <= 0;
  const bookHref = isFree ? "/contact" : `/book?activity=${activity.slug}`;
  const firstPriced = copy.options.find((o) => o.price);
  const heroPrice = firstPriced ? firstPriced.price : !isFree && copy.options.length === 0 ? `${activity.priceFrom} €` : null;
  const waDigits = whatsapp.replace(/[^\d]/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}` : "/contact";

  const heroImage = isDisplayableImageSrc(activity.heroImage) ? activity.heroImage : (OWN_PHOTO[activity.slug] ?? FILLER[1]);
  // Only this activity's own photos: padding with other activities' pictures made
  // every page show the same generic set. The default photo stands in only when
  // nothing was uploaded for it at all.
  const photos = [...new Set([heroImage, ...(activity.gallery ?? []).filter(isDisplayableImageSrc)])];

  const title = copy.h1 || activity.title;
  const steps = copy.steps;
  const accommodations = stay?.accommodations ?? [];

  const others = ["quad-desert", "camel-trek", "sandboarding-desert", "4x4"]
    .filter((k) => k !== activity.slug)
    .slice(0, 3)
    .map((k) => {
      const exists = allActivities.some((a) => a.slug === k);
      return { key: k, ...othersMap[k], href: exists ? `/activities/${k}` : "/contact" };
    });

  return (
    <div className="acc act">
      {/* 1 — Hero */}
      <section className="acc-hero act-hero">
        <Image src={heroImage} alt="" fill priority sizes="100vw" className="acc-hero-img act-drift" />
        <div className="acc-hero-shade" />
        <div className="wrap acc-hero-inner">
          <Link href="/activities" className="acc-back">{t("ui.back")}</Link>
          <p className="acc-eyebrow acc-eyebrow--light">{copy.eyebrow}</p>
          <h1>{title}</h1>
          <p className="acc-hero-lead">{copy.tagline || activity.tagline}</p>
          <p className="acc-hero-price">
            {heroPrice ? (
              <>
                <span>{t("ui.from")}</span> <strong>{heroPrice}</strong> <span>{t("ui.perPerson")}</span>
              </>
            ) : (
              <span>{copy.options[0]?.text}</span>
            )}
          </p>
          <ul className="acc-highlights">
            {copy.highlights.map((h) => (
              <li key={h}><AccIcon name="check" size={18} /> {h}</li>
            ))}
          </ul>
          <div className="acc-actions">
            <Link href={bookHref} className="acc-btn acc-btn--terracotta">{copy.hero.cta} →</Link>
            <a href="#photos" className="acc-btn acc-btn--ghost">{t("ui.viewPhotos")}</a>
          </div>
        </div>
      </section>

      <ul className="acc-trust wrap">
        {trust.map((label, i) => (
          <li key={label}><AccIcon name={TRUST_ICONS[i] ?? "check"} size={20} /> {label}</li>
        ))}
      </ul>

      {/* 2 — Gallery */}
      <section className="acc-section acc-gallery-section" id="photos">
        <div className="wrap">
          <AccGallery
            photos={photos}
            title={title}
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

      {/* 3 — Quick info */}
      <section className="acc-quick">
        <ul className="wrap">
          {copy.quick.map((q) => (
            <li key={q.icon + q.label}><AccIcon name={q.icon} size={26} /><span>{q.label}</span></li>
          ))}
        </ul>
      </section>

      {/* 4 — About */}
      <section className="acc-section acc-about">
        <div className="wrap acc-narrow">
          <Reveal>
            <p className="acc-eyebrow">{t("ui.aboutEyebrow")}</p>
            <h2>{title}</h2>
            {(copy.about.length ? copy.about : [activity.description]).map((p) => (<p key={p}>{p}</p>))}
          </Reveal>
        </div>
      </section>

      {/* 5 — Choose your experience */}
      {copy.options.length > 0 && (
        <section className="acc-section acc-activities" id="options">
          <div className="wrap">
            <Reveal className="acc-head">
              <p className="acc-eyebrow">{t("ui.optionsEyebrow")}</p>
              <h2>{copy.optionsTitle}</h2>
            </Reveal>
            <div className="act-options">
              {copy.options.map((o, i) => (
                <Reveal key={o.name} delay={i * 80}>
                  <div className="act-option">
                    <strong>{o.name}</strong>
                    <span className="act-option-price">
                      {o.price ? <>{o.price} <small>{t("ui.perPerson")}</small></> : t("ui.included")}
                    </span>
                    <span className="act-option-text">{o.text}</span>
                    <Link href={bookHref} className="acc-btn acc-btn--terracotta acc-btn--small">{copy.optionCta} →</Link>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="acc-note">{t("combine.cross")}</p>
          </div>
        </section>
      )}

      {/* 6 — What to expect */}
      {steps.length > 0 && (
        <section className="acc-section acc-timeline-section">
          <div className="wrap acc-narrow">
            <Reveal className="acc-head">
              <p className="acc-eyebrow">{t("ui.expectEyebrow")}</p>
              <h2>{t("ui.expectEyebrow")}</h2>
            </Reveal>
            <ol className="acc-timeline">
              {steps.map((s, i) => (
                <Reveal as="li" key={s} delay={(i % 4) * 60}>
                  <span className="acc-time">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* 7 — Best time */}
      <section className="acc-section acc-included act-best">
        <div className="wrap">
          <Reveal className="acc-head">
            <p className="acc-eyebrow acc-eyebrow--amber">{t("ui.bestEyebrow")}</p>
            <h2>{t("best.title")}</h2>
          </Reveal>
          <div className="act-best-grid">
            {(["morning", "afternoon", "sunset"] as const).map((k, i) => (
              <Reveal key={k} delay={i * 80}>
                <div className={`act-best-card${k === "sunset" && BEST_SUNSET.includes(activity.slug) ? " is-featured" : ""}`}>
                  <AccIcon name="sun" size={28} />
                  <strong>{t(`best.${k}.title`)}</strong>
                  <span>{t(`best.${k}.text`)}</span>
                </div>
              </Reveal>
            ))}
          </div>
          {copy.bestNote && <p className="acc-note">{copy.bestNote}</p>}
        </div>
      </section>

      {/* 8 — Who is it for */}
      <section className="acc-section acc-forwhom">
        <div className="wrap">
          <Reveal className="acc-head">
            <p className="acc-eyebrow">{t("ui.forWhomEyebrow")}</p>
            <h2>{title}</h2>
          </Reveal>
          <div className="act-chips">
            {copy.forWhom.map((f, i) => (
              <Reveal key={f} delay={i * 60}>
                <span className="act-chip">{f}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 9 — Safety */}
      <section className="acc-section">
        <div className="wrap acc-narrow">
          <Reveal className="acc-head">
            <p className="acc-eyebrow">{t("ui.safetyEyebrow")}</p>
            <h2>{t("ui.safetyEyebrow")}</h2>
          </Reveal>
          <Reveal>
            <ul className="act-safety">
              {copy.safety.map((s) => (
                <li key={s}><AccIcon name="shield" size={18} /> {s}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* 10 — What to bring */}
      <section className="acc-section acc-compare">
        <div className="wrap">
          <Reveal className="acc-head">
            <p className="acc-eyebrow">{t("ui.bringEyebrow")}</p>
            <h2>{t("bring.title")}</h2>
          </Reveal>
          <ul className="act-bring">
            {bring.map((b, i) => (
              <Reveal as="li" key={b.text} delay={(i % 6) * 50}>
                <AccIcon name={b.icon} size={28} />
                <span>{b.text}</span>
              </Reveal>
            ))}
          </ul>
          <p className="acc-note">{t("bring.cool")}</p>
        </div>
      </section>

      {/* 11 — Combine with your stay */}
      {accommodations.length > 0 && stay && (
        <section className="acc-section">
          <div className="wrap">
            <Reveal className="acc-head">
              <p className="acc-eyebrow">{t("ui.combineEyebrow")}</p>
              <h2>{t("combine.title")}</h2>
              <p>{t("combine.text")}</p>
            </Reveal>
            <div className="acc-grid acc-grid--3">
              {accommodations.map((a, i) => (
                <Reveal key={a.slug} delay={i * 80}>
                  <Link href={`/camp/${stay.slug}/${a.slug}`} className="acc-act">
                    <span className="acc-act-media">
                      {isDisplayableImageSrc(a.image) && (
                        <Image src={a.image} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" />
                      )}
                    </span>
                    <span className="acc-act-body">
                      <strong>{a.title}</strong>
                      <span>{a.sleeps}</span>
                      <span className="acc-link acc-link--small">{t("ui.fromNight", { price: a.priceFrom })} →</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
            <p className="acc-more">
              <Link href="/camp" className="acc-btn acc-btn--outline">{t("ui.exploreAccommodation")}</Link>
            </p>
          </div>
        </section>
      )}

      {/* 12 — Other activities */}
      <section className="acc-section acc-activities">
        <div className="wrap">
          <Reveal className="acc-head">
            <p className="acc-eyebrow">{t("ui.othersEyebrow")}</p>
            <h2>{t("others.title")}</h2>
          </Reveal>
          <div className="acc-grid acc-grid--3">
            {others.map((o, i) => (
              <Reveal key={o.key} delay={i * 80}>
                <Link href={o.href} className="acc-act">
                  <span className="acc-act-media">
                    <Image src={PHOTO[o.photo] ?? FILLER[0]} alt="" fill sizes="(max-width: 900px) 100vw, 33vw" />
                  </span>
                  <span className="acc-act-body">
                    <strong>{o.title}</strong>
                    <span>{o.text}</span>
                    <span className="acc-link acc-link--small">
                      {o.href.startsWith("/activities") ? t("ui.discoverActivity") : t("ui.askTeam")} →
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 13 — FAQ */}
      <section className="acc-section">
        <div className="wrap acc-narrow">
          <Reveal className="acc-head">
            <p className="acc-eyebrow">{t("ui.faqEyebrow")}</p>
            <h2>{t("ui.faqTitle")}</h2>
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

      {/* 14 — Final call to action */}
      <section className="acc-final">
        <Image src={heroImage} alt="" fill sizes="100vw" className="acc-hero-img" />
        <div className="acc-hero-shade" />
        <Reveal className="wrap acc-final-inner">
          <h2>{copy.final.title}</h2>
          <p>{copy.final.text}</p>
          <div className="acc-actions acc-actions--center">
            <Link href={bookHref} className="acc-btn acc-btn--terracotta">{copy.final.cta} →</Link>
            <a href={waHref} target="_blank" rel="noreferrer noopener" className="acc-btn acc-btn--ghost">WhatsApp</a>
          </div>
        </Reveal>
      </section>

      {/* Sticky booking bar (phones only) */}
      <div className="acc-sticky">
        <span>{heroPrice ? `${t("ui.from")} ${heroPrice}` : t("ui.included")}</span>
        <Link href={bookHref} className="acc-btn acc-btn--terracotta acc-btn--small">{copy.sticky} →</Link>
      </div>
    </div>
  );
}
