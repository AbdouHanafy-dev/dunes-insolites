import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
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

export default async function BookDirect() {
  const t = await getTranslations("bookDirect");
  const here = [t("here1"), t("here2"), t("here3"), t("here4"), t("here5"), t("here6")];
  const there = [t("there1"), t("there2"), t("there3"), t("there4"), t("there5"), t("there6")];

  return (
    <section className="block direct" id="book-direct">
      <div className="wrap">
        <Reveal>
          <p className="sect-eyebrow">{t("eyebrow")}</p>
          <h2 className="sect-title" style={{ fontSize: "clamp(32px,4.4vw,64px)" }}>
            {t("titleLine1")}
            <br />
            {DIRECT_DISCOUNT} {t("titleDiscountSuffix")}
          </h2>
          <p className="lead">{t("lead")}</p>
        </Reveal>

        <Reveal>
          <div className="compare">
            <div className="col here">
              <span className="tag">{t("tagHere")}</span>
              <h3>{t("headingHere")}</h3>
              <ul>
                {here.map((text) => (
                  <li key={text}>
                    <span className="mark yes" aria-hidden="true">
                      ✓
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col">
              <span className="tag" style={{ color: "rgba(253,241,225,.5)" }}>
                {t("tagThere")}
              </span>
              <h3>{t("headingThere")}</h3>
              <ul>
                {there.map((text) => (
                  <li key={text}>
                    <span className="mark no" aria-hidden="true">
                      ·
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ marginTop: 48 }}>
            <Link href="/book" className="btn-accent">
              {t("cta")}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
