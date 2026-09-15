import { getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";
import { site } from "@/lib/site";
import type { Activity } from "@/lib/types";

/**
 * New (visual identity pass, 14 Sep 2026 — audit §15: "location was
 * identified as a conversion gap; almost nothing on the site is visually
 * Tunisian, it's carried entirely by text/metadata"). Every fact here is
 * already verified elsewhere in the codebase — `site.coords`/`site.address`
 * (used by the footer and the LodgingBusiness JSON-LD in app/[locale]/layout.tsx)
 * and `meetingPoint`, which is identical, real copy on every Activity in
 * every locale ("The Sabria gate, 10 minutes south of Douz" / its translated
 * equivalent). No distance or detail here is invented. The map is the same
 * OpenStreetMap embed pattern already used on /contact — no new API key,
 * no new dependency. Every label, including the map's `title` attribute,
 * runs through next-intl (`location`, all 6 locales).
 */
export default async function Location({
  meetingPoint,
}: {
  meetingPoint?: Activity["meetingPoint"];
}) {
  const t = await getTranslations("location");
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${
    site.coords.lng - 0.08
  }%2C${site.coords.lat - 0.06}%2C${site.coords.lng + 0.08}%2C${
    site.coords.lat + 0.06
  }&layer=mapnik&marker=${site.coords.lat}%2C${site.coords.lng}`;

  return (
    <section className="block location" id="location">
      <div className="wrap location-grid">
        <Reveal className="location-copy">
          <p className="idx-label">{t("eyebrow")}</p>
          <h2 className="sect-title" style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>
            {t("title")}
          </h2>
          <dl className="location-facts">
            <div>
              <dt>{t("camp")}</dt>
              <dd>Sabria</dd>
            </div>
            <div>
              <dt>{t("region")}</dt>
              <dd>{site.address}</dd>
            </div>
            <div>
              <dt>{t("coordinates")}</dt>
              <dd className="idx-label">
                {site.coords.lat.toFixed(4)}° N · {site.coords.lng.toFixed(4)}° E
              </dd>
            </div>
            {meetingPoint && (
              <div>
                <dt>{t("meetingPoint")}</dt>
                <dd>{meetingPoint}</dd>
              </div>
            )}
          </dl>
        </Reveal>
        <Reveal className="location-map">
          <iframe
            src={mapSrc}
            title={t("mapTitle")}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Reveal>
      </div>
    </section>
  );
}
