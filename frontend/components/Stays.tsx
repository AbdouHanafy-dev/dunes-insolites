import Image from "next/image";
import { PriceText } from "@/components/Price";
import { priceToken } from "@/lib/currency";
import { Link } from "@/i18n/navigation";
import { getStays } from "@/lib/api";
import { getLocale, getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { isDisplayableImageSrc } from "@/lib/imageSrc";
import { sortByPrice } from "@/lib/guestPricing";
import { getSiteImages } from "@/lib/api";
import { stayCardFallback } from "@/lib/siteImages";

/**
 * Homepage accommodation section (restructured 24 Sep 2026, on request):
 * the two nights side by side — bivouac and the fixed-camp nuitée — and,
 * directly under the nuitée, the accommodations a guest picks from (tent,
 * room, suite). The bivouac has no accommodation choice (see CLAUDE.md), so
 * only stays that actually carry `accommodations` get the second row.
 * Everything shown is catalogue data; a stay without a photo gets a visible
 * placeholder rather than an invented image.
 */
export default async function Stays() {
  const [stays, t, tCard, images] = await Promise.all([
    getStays(await getLocale()),
    getTranslations("staysSection"),
    getTranslations("accommodationCard"),
    getSiteImages(),
  ]);
  if (!stays.length) return null;

  const withChoice = stays.find((s) => (s.accommodations?.length ?? 0) > 0);

  return (
    <section className="block stays stays--split" id="stays">
      <div className="wrap">
        <Reveal className="head">
          <p className="idx-label">{t("eyebrow")}</p>
          <h2 className="sect-title">
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </h2>
          <p>{t("lead")}</p>
        </Reveal>

        <div className="stay-duo">
          {stays.map((stay, i) => (
            <Reveal key={stay.slug} delay={i * 80}>
              <Link href={`/camp/${stay.slug}`} className="stay-tile">
                <span className="stay-tile-media">
                  <Image
                    src={isDisplayableImageSrc(stay.image) ? stay.image : stayCardFallback(images, stay.slug)}
                    alt={stay.tagline || stay.title}
                    fill
                    sizes="(max-width: 900px) 100vw, 50vw"
                    style={{ objectFit: "cover" }}
                  />
                </span>
                <span className="stay-tile-body">
                  <span className="idx-label">
                    {String(i + 1).padStart(2, "0")} / {stay.kicker}
                  </span>
                  <strong>{stay.title}</strong>
                  <span className="stay-tile-desc">{stay.description}</span>
                  <span className="stay-tile-foot">
                    <span>{<PriceText text={t("fromPrice", { price: priceToken(stay.priceFrom)})} />}</span>
                    <span className="stay-tile-cta">{tCard("exploreThisStay")}</span>
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        {withChoice?.accommodations && (
          <div className="stay-choices">
            <Reveal>
              <h3 className="stay-choices-title">{t("chooseAccommodation")}</h3>
            </Reveal>
            <div className="stay-choices-grid">
              {sortByPrice(withChoice.accommodations).map((acc, i) => (
                <Reveal key={acc.slug} delay={i * 80}>
                  <Link href={`/camp/${withChoice.slug}/${acc.slug}`} className="stay-choice">
                    <span className="stay-choice-media">
                      {isDisplayableImageSrc(acc.image) && (
                        <Image
                          src={acc.image}
                          alt={acc.title}
                          fill
                          sizes="(max-width: 900px) 100vw, 33vw"
                          style={{ objectFit: "cover" }}
                        />
                      )}
                    </span>
                    <span className="stay-choice-body">
                      <strong>{acc.title}</strong>
                      <span className="stay-choice-sleeps">{acc.sleeps}</span>
                      <span className="stay-choice-price">{<PriceText text={t("fromPrice", { price: priceToken(acc.priceFrom)})} />}</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
