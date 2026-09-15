import Image from "next/image";
import MaintenanceCountdown from "@/components/MaintenanceCountdown";
import MaintenanceNotifyForm from "@/components/MaintenanceNotifyForm";

// A tiny, self-contained dictionary rather than routing this through
// next-intl's messages/*.json catalogue — this page sits outside the
// [locale] tree on purpose (see layout.tsx's comment) and is reached with
// only a `locale` query param, not real next-intl context.
//
// Redesigned (15 Sep 2026, on request) — this same page now also serves as
// a full-site launch/relaunch countdown (see middleware.ts's "/*" wildcard
// window and MaintenanceCrud.tsx's "🌐 Tout le site" option), not only a
// single broken page's apology. Copy leans anticipatory rather than
// apologetic so it reads right in both cases; a window's own `message`
// field (admin-editable) overrides the body text either way. The
// notify-me form (on request, matching a reference "coming soon" page)
// posts through the same subscribe() the footer's newsletter form
// already uses — one real subscriber list, not a second one.
const COPY: Record<
  string,
  {
    title: string; heading: string; defaultBody: string; endsIn: string; soon: string;
    days: string; hours: string; minutes: string; seconds: string;
    notifyEyebrow: string; notifyLabel: string; notifyPlaceholder: string; notifyConsent: string;
    notifyButton: string; notifyDone: string; notifyError: string;
  }
> = {
  fr: {
    title: "Bientôt disponible",
    heading: "Quelque chose de nouveau arrive.",
    defaultBody: "Nous préparons la suite. Le site rouvre dès la fin du compte à rebours.",
    endsIn: "Ouverture dans",
    soon: "C'est pour très bientôt.",
    days: "jours", hours: "heures", minutes: "min", seconds: "sec",
    notifyEyebrow: "Restez informé",
    notifyLabel: "Adresse e-mail",
    notifyPlaceholder: "vous@email.com",
    notifyConsent: "J'accepte d'être contacté(e) par e-mail uniquement pour l'ouverture du site. Aucun autre usage, aucun partage.",
    notifyButton: "M'avertir à l'ouverture",
    notifyDone: "C'est noté — vous serez averti(e) dès l'ouverture.",
    notifyError: "Une erreur est survenue, réessayez.",
  },
  en: {
    title: "Coming soon",
    heading: "Something new is on its way.",
    defaultBody: "We're putting the finishing touches on it. The site reopens the moment the countdown ends.",
    endsIn: "Opens in",
    soon: "Any moment now.",
    days: "days", hours: "hours", minutes: "min", seconds: "sec",
    notifyEyebrow: "Stay informed",
    notifyLabel: "Email address",
    notifyPlaceholder: "you@email.com",
    notifyConsent: "I agree to be contacted by email only about the site launch. No other use, no sharing.",
    notifyButton: "Notify me at launch",
    notifyDone: "Got it — we'll email you the moment it's live.",
    notifyError: "Something went wrong, please try again.",
  },
  de: {
    title: "Bald verfügbar",
    heading: "Etwas Neues ist auf dem Weg.",
    defaultBody: "Wir legen letzte Hand an. Die Seite öffnet, sobald der Countdown endet.",
    endsIn: "Öffnet in",
    soon: "Gleich geht's los.",
    days: "Tage", hours: "Std", minutes: "Min", seconds: "Sek",
    notifyEyebrow: "Auf dem Laufenden bleiben",
    notifyLabel: "E-Mail-Adresse",
    notifyPlaceholder: "sie@email.com",
    notifyConsent: "Ich bin damit einverstanden, ausschließlich zur Eröffnung der Website per E-Mail kontaktiert zu werden. Keine andere Nutzung, keine Weitergabe.",
    notifyButton: "Bei Eröffnung benachrichtigen",
    notifyDone: "Alles klar — wir schreiben Ihnen, sobald es live ist.",
    notifyError: "Etwas ist schiefgelaufen, bitte versuchen Sie es erneut.",
  },
  it: {
    title: "Prossimamente",
    heading: "Qualcosa di nuovo sta arrivando.",
    defaultBody: "Ci stiamo lavorando negli ultimi dettagli. Il sito riapre alla fine del conto alla rovescia.",
    endsIn: "Apertura tra",
    soon: "Ci siamo quasi.",
    days: "giorni", hours: "ore", minutes: "min", seconds: "sec",
    notifyEyebrow: "Resta informato",
    notifyLabel: "Indirizzo e-mail",
    notifyPlaceholder: "tu@email.com",
    notifyConsent: "Accetto di essere contattato via e-mail solo per l'apertura del sito. Nessun altro uso, nessuna condivisione.",
    notifyButton: "Avvisami all'apertura",
    notifyDone: "Fatto — ti scriveremo non appena sarà online.",
    notifyError: "Si è verificato un errore, riprova.",
  },
  da: {
    title: "Kommer snart",
    heading: "Noget nyt er på vej.",
    defaultBody: "Vi lægger sidste hånd på værket. Siden åbner, når nedtællingen slutter.",
    endsIn: "Åbner om",
    soon: "Meget snart.",
    days: "dage", hours: "timer", minutes: "min", seconds: "sek",
    notifyEyebrow: "Hold dig opdateret",
    notifyLabel: "E-mailadresse",
    notifyPlaceholder: "dig@email.com",
    notifyConsent: "Jeg accepterer kun at blive kontaktet via e-mail om sidens åbning. Ingen anden brug, ingen deling.",
    notifyButton: "Giv mig besked ved åbning",
    notifyDone: "Modtaget — vi skriver til dig, så snart siden er live.",
    notifyError: "Der gik noget galt, prøv igen.",
  },
  ar: {
    title: "قريبًا",
    heading: "شيء جديد في الطريق.",
    defaultBody: "نعمل على اللمسات الأخيرة. يفتح الموقع فور انتهاء العد التنازلي.",
    endsIn: "الافتتاح خلال",
    soon: "قريبًا جدًا.",
    days: "أيام", hours: "ساعات", minutes: "دقائق", seconds: "ثواني",
    notifyEyebrow: "ابق على اطلاع",
    notifyLabel: "البريد الإلكتروني",
    notifyPlaceholder: "you@email.com",
    notifyConsent: "أوافق على أن يتم التواصل معي عبر البريد الإلكتروني فقط بخصوص افتتاح الموقع. لا استخدام آخر ولا مشاركة.",
    notifyButton: "أعلمني عند الافتتاح",
    notifyDone: "تم — سنراسلك فور تفعيل الموقع.",
    notifyError: "حدث خطأ، يرجى المحاولة مرة أخرى.",
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
          <>
            <div className="maint-countdown-wrap">
              <p className="idx-label maint-ends-label">{copy.endsIn}</p>
              <MaintenanceCountdown
                endsAt={endsAt}
                soonLabel={copy.soon}
                labels={{ days: copy.days, hours: copy.hours, minutes: copy.minutes, seconds: copy.seconds }}
              />
            </div>
            <MaintenanceNotifyForm
              labels={{
                eyebrow: copy.notifyEyebrow,
                label: copy.notifyLabel,
                placeholder: copy.notifyPlaceholder,
                consent: copy.notifyConsent,
                button: copy.notifyButton,
                sending: "…",
                done: copy.notifyDone,
                genericError: copy.notifyError,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
