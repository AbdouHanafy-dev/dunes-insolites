import { getTranslations } from "next-intl/server";
import Reveal from "@/components/Reveal";

export default async function Steps() {
  const t = await getTranslations("steps");
  const steps = [
    { n: "01", title: t("step1Title"), body: t("step1Body") },
    { n: "02", title: t("step2Title"), body: t("step2Body") },
    { n: "03", title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <section className="block steps" id="steps">
      <div className="wrap">
        <Reveal>
          <p className="sect-eyebrow">{t("eyebrow")}</p>
          <h2 className="sect-title">
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </h2>
        </Reveal>
        <div className="grid">
          {steps.map((s, i) => (
            <Reveal key={s.n} className="step" delay={i * 90}>
              <div className="n">{s.n}</div>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
