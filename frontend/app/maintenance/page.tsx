import MaintenanceCountdown from "@/components/MaintenanceCountdown";

// A tiny, self-contained dictionary rather than routing this through
// next-intl's messages/*.json catalogue — this page sits outside the
// [locale] tree on purpose (see layout.tsx's comment) and is reached with
// only a `locale` query param, not real next-intl context. Six short
// strings don't justify wiring NextIntlClientProvider back in for this one
// route.
const COPY: Record<
  string,
  { title: string; heading: string; defaultBody: string; endsIn: string; soon: string; days: string; hours: string; minutes: string; seconds: string }
> = {
  fr: {
    title: "Maintenance en cours",
    heading: "Cette page est en maintenance",
    defaultBody: "Nous travaillons dessus. Le reste du site reste accessible normalement.",
    endsIn: "De retour dans",
    soon: "De retour dans un instant.",
    days: "jours",
    hours: "heures",
    minutes: "min",
    seconds: "sec",
  },
  en: {
    title: "Under maintenance",
    heading: "This page is under maintenance",
    defaultBody: "We're working on it. The rest of the site is available as usual.",
    endsIn: "Back in",
    soon: "Back in just a moment.",
    days: "days",
    hours: "hours",
    minutes: "min",
    seconds: "sec",
  },
  de: {
    title: "Wartungsarbeiten",
    heading: "Diese Seite wird gerade gewartet",
    defaultBody: "Wir arbeiten daran. Der Rest der Website ist wie gewohnt erreichbar.",
    endsIn: "Zurück in",
    soon: "Gleich wieder da.",
    days: "Tage",
    hours: "Std",
    minutes: "Min",
    seconds: "Sek",
  },
  it: {
    title: "Manutenzione in corso",
    heading: "Questa pagina è in manutenzione",
    defaultBody: "Ci stiamo lavorando. Il resto del sito resta disponibile normalmente.",
    endsIn: "Di ritorno tra",
    soon: "Di ritorno tra un istante.",
    days: "giorni",
    hours: "ore",
    minutes: "min",
    seconds: "sec",
  },
  da: {
    title: "Under vedligeholdelse",
    heading: "Denne side er under vedligeholdelse",
    defaultBody: "Vi arbejder på det. Resten af siden er tilgængelig som normalt.",
    endsIn: "Tilbage om",
    soon: "Tilbage om et øjeblik.",
    days: "dage",
    hours: "timer",
    minutes: "min",
    seconds: "sek",
  },
  ar: {
    title: "الصيانة جارية",
    heading: "هذه الصفحة قيد الصيانة",
    defaultBody: "نعمل على ذلك حاليًا. باقي الموقع متاح كالمعتاد.",
    endsIn: "العودة خلال",
    soon: "العودة خلال لحظات.",
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
    <div
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        background: "var(--maroon)",
        color: "var(--paper)",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontSize: 13,
            color: "var(--ember, #f0a558)",
            marginBottom: 12,
          }}
        >
          {copy.title}
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(24px, 4vw, 34px)",
            margin: "0 0 14px",
          }}
        >
          {copy.heading}
        </h1>
        <p style={{ opacity: 0.8, lineHeight: 1.6, margin: "0 0 28px" }}>{msg || copy.defaultBody}</p>

        {endsAt && (
          <>
            <p style={{ fontSize: 13, opacity: 0.65, marginBottom: 10 }}>{copy.endsIn}</p>
            <MaintenanceCountdown
              endsAt={endsAt}
              soonLabel={copy.soon}
              labels={{ days: copy.days, hours: copy.hours, minutes: copy.minutes, seconds: copy.seconds }}
            />
          </>
        )}
      </div>
    </div>
  );
}
