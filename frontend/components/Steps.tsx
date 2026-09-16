import { getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";

/**
 * Restructured (differentiation pass, 31 Aug 2026) away from the
 * eyebrow + 2-line-headline + 3-col-grid skeleton every other homepage
 * section uses, and off the second dark full-width band this section used
 * to be (Experience.tsx's photo band is the one dark moment the page keeps
 * now). A numbered vertical index instead — the actual "Field Log" voice:
 * a compact monospace kicker, then each step as a row (number in a narrow
 * column, real content beside it), hairline rules between rows instead of
 * a boxed grid cell. See audit-differentiation.md for what this replaces.
 */
// `override` is the "steps" CMS block from the homepage's Page row (see
// app/[locale]/(site)/page.tsx), when one exists with at least one item -
// otherwise this renders the translation-file version below, same
// fall-back convention as about/faq. Only reads the homepage's own block;
// activities/page.tsx renders this section too, always with translations.
export default async function Steps({ override }: { override?: Record<string, unknown> } = {}) {
  const t = await getTranslations("steps");

  const cmsItems = Array.isArray(override?.items)
    ? (override.items as { title?: string; body?: string }[])
    : [];

  const steps =
    cmsItems.length > 0
      ? cmsItems.map((item, i) => ({
          n: String(i + 1).padStart(2, "0"),
          title: item.title ?? "",
          body: item.body ?? "",
        }))
      : [
          { n: "01", title: t("step1Title"), body: t("step1Body") },
          { n: "02", title: t("step2Title"), body: t("step2Body") },
          { n: "03", title: t("step3Title"), body: t("step3Body") },
        ];
  const eyebrow = (typeof override?.eyebrow === "string" && override.eyebrow) || t("eyebrow");

  return (
    <section className="log-index" id="steps">
      <div className="wrap">
        <Reveal>
          <p className="log-index-kicker">
            {eyebrow} — 01–{String(steps.length).padStart(2, "0")}
          </p>
        </Reveal>
        <div className="log-index-list">
          {steps.map((s, i) => (
            <Reveal key={s.n} className="log-row" delay={i * 90}>
              <span className="log-num">{s.n}</span>
              <div className="log-row-body">
                <h4>{s.title}</h4>
                <p>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
