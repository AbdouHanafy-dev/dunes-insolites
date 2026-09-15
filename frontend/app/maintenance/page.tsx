import Image from "next/image";
import MaintenanceCountdown from "@/components/MaintenanceCountdown";

// A tiny, self-contained dictionary rather than routing this through
// next-intl's messages/*.json catalogue — this page sits outside the
// [locale] tree on purpose (see layout.tsx's comment) and is reached with
// only a `locale` query param, not real next-intl context. Six short
// strings don't justify wiring NextIntlClientProvider back in for this one
// route.
//
// Redesigned (15 Sep 2026, on request) — this same page now also serves as
// a full-site launch/relaunch countdown (see middleware.ts's "/*" wildcard
// window and MaintenanceCrud.tsx's "🌐 Tout le site" option), not only a
// single broken page's apology. Copy leans anticipatory rather than
// apologetic so it reads right in both cases; a window's own `message`
// field (admin-editable) overrides the body text either way.
const COPY: Record<
  string,
  { title: string; heading: string; defaultBody: string; endsIn: string; soon: string; days: string; hours: string; minutes: string; seconds: string }
> = {
  fr: {
    title: "Bientôt disponible",
    heading: "Quelque chose de nouveau arrive.",
    defaultBody: "Nous préparons la suite. Le site rouvre dès la fin du compte à rebours.",
    endsIn: "Ouverture dans",
    soon: "C'est pour très bientôt.",
    days: "jours",
    hours: "heures",
    minutes: "min",
    seconds: "sec",
  },
  en: {
    title: "Coming soon",
    heading: "Something new is on its way.",
    defaultBody: "We're putting the finishing touches on it. The site reopens the moment the countdown ends.",
    endsIn: "Opens in",
    soon: "Any moment now.",
    days: "days",
    hours: "hours",
    minutes: "min",
    seconds: "sec",
  },
  de: {
    title: "Bald verfügbar",
    heading: "Etwas Neues ist auf dem Weg.",
    defaultBody: "Wir legen letzte Hand an. Die Seite öffnet, sobald der Countdown endet.",
    endsIn: "Öffnet in",
    soon: "Gleich geht's los.",
    days: "Tage",
    hours: "Std",
    minutes: "Min",
    seconds: "Sek",
  },
  it: {
    title: "Prossimamente",
    heading: "Qualcosa di nuovo sta arrivando.",
    defaultBody: "Ci stiamo lavorando negli ultimi dettagli. Il sito riapre alla fine del conto alla rovescia.",
    endsIn: "Apertura tra",
    soon: "Ci siamo quasi.",
    days: "giorni",
    hours: "ore",
    minutes: "min",
    seconds: "sec",
  },
  da: {
    title: "Kommer snart",
    heading: "Noget nyt er på vej.",
    defaultBody: "Vi lægger sidste hånd på værket. Siden åbner, når nedtællingen slutter.",
    endsIn: "Åbner om",
    soon: "Meget snart.",
    days: "dage",
    hours: "timer",
    minutes: "min",
    seconds: "sek",
  },
  ar: {
    title: "قريبًا",
    heading: "شيء جديد في الطريق.",
    defaultBody: "نعمل على اللمسات الأخيرة. يفتح الموقع فور انتهاء العد التنازلي.",
    endsIn: "الافتتاح خلال",
    soon: "قريبًا جدًا.",
    days: "أيام",
    hours: "ساعات",
    minutes: "دقائق",
    seconds: "ثواني",
  },
};

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; endsAt?: string; msg?: string }>;
}) {
  const { locale: rawLocale, endsAt, msg } = await searchParams;
  const locale = rawLocale && COPY[rawLocale] ? rawLocale : "fr";
  const copy = COPY[locale];
  const isRtl = locale === "ar";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="maint-page">
      <div className="maint-bg">
        <Image src="/images/gate.jpg" alt="" fill sizes="100vw" priority style={{ objectFit: "cover" }} />
      </div>
      <div className="maint-content">
        <p className="idx-label maint-eyebrow">{copy.title}</p>
        <h1 className="display maint-heading">{copy.heading}</h1>
        <p className="maint-body">{msg || copy.defaultBody}</p>

        {endsAt && (
          <div className="maint-countdown-wrap">
            <p className="idx-label maint-ends-label">{copy.endsIn}</p>
            <MaintenanceCountdown
              endsAt={endsAt}
              soonLabel={copy.soon}
              labels={{ days: copy.days, hours: copy.hours, minutes: copy.minutes, seconds: copy.seconds }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
