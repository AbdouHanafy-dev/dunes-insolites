import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getMyReservations, getActivities, type MyReservation } from "@/lib/api";
import { Link, redirect } from "@/i18n/navigation";
import { site } from "@/lib/site";

/**
 * Second premium pass (31 Aug 2026) on the first redesign - same
 * architecture (sidebar, welcome message, featured trip card kept exactly
 * as the visual hero), filled out with real sections below it instead of
 * empty space. Every section reads real data already available from
 * getMyReservations/getActivities; nothing here is a fabricated statistic.
 * The generic "My account" info card was moved to /account/profile - it
 * doesn't deserve the dashboard's primary space (see that file's comment).
 */

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function bookingReference(r: MyReservation): string {
  const year = new Date(r.createdAt).getFullYear();
  const short = r.reservationId.replace(/-/g, "").slice(-5).toUpperCase();
  return `DI-${year}-${short}`;
}

function pickNextTrip(reservations: MyReservation[]): MyReservation | null {
  const today = todayISO();
  const upcoming = reservations.filter((r) => {
    if (r.status === "CANCELLED" || r.status === "REJECTED") return false;
    const date = r.checkInDate ?? r.serviceDate;
    return date !== null && date >= today;
  });
  upcoming.sort((a, b) => {
    const da = a.checkInDate ?? a.serviceDate ?? "";
    const db = b.checkInDate ?? b.serviceDate ?? "";
    return da.localeCompare(db);
  });
  return upcoming[0] ?? null;
}

/** Real, derived from the reservation's actual status - never hardcoded to
 *  one state. CANCELLED/REJECTED have no journey (returns null): "share
 *  your experience" makes no sense for a trip that never happened. */
function journeyStepIndex(status: string): number | null {
  switch (status) {
    case "PENDING":
      return 1;
    case "CONFIRMED":
      return 2;
    case "CHECKED_IN":
      return 3;
    case "COMPLETED":
      return 4;
    default:
      return null;
  }
}

type T = Awaited<ReturnType<typeof getTranslations>>;

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("account");
  const session = await getSession();
  if (!session) return null; // layout already redirects; keeps this render branch simple
  if (session.role === "CHAUFFEUR") {
    redirect({ href: "/account/trips", locale });
    return null;
  }

  const [reservations, activities] = await Promise.all([
    getMyReservations(session.accessToken),
    getActivities(locale),
  ]);
  const nextTrip = pickNextTrip(reservations);
  const firstName = session.name.trim().split(/\s+/)[0] ?? session.name;

  // Recommendations: real activities, excluding whatever the next trip
  // already includes - "you may also like", not "here's everything again".
  const alreadyBooked = new Set(
    (nextTrip?.extras ?? []).map((e) => e.name.toLowerCase()),
  );
  const recommended = activities.filter((a) => !alreadyBooked.has(a.title.toLowerCase())).slice(0, 3);

  return (
    <div>
      <div className="account-overview-header">
        <p className="account-overview-eyebrow">{t("welcomeBack", { name: firstName })}</p>
        <h1 className="account-overview-heading">
          {nextTrip ? t("nextAdventureTitle") : t("noAdventureTitle")}
        </h1>
      </div>

      {nextTrip ? <NextTripHero reservation={nextTrip} t={t} /> : <NoTripCta t={t} />}

      {nextTrip && <TripAtAGlance reservation={nextTrip} t={t} />}
      {nextTrip && journeyStepIndex(nextTrip.status) !== null && (
        <YourJourney stepIndex={journeyStepIndex(nextTrip.status)!} t={t} />
      )}
      {nextTrip && <BeforeYourTrip t={t} />}

      {recommended.length > 0 && <Recommendations activities={recommended} t={t} />}

      <NeedHelp t={t} />
    </div>
  );
}

function NextTripHero({ reservation, t }: { reservation: MyReservation; t: T }) {
  const line = [...reservation.tourTypes, ...reservation.tours][0];
  const title = line?.name ?? reservation.reservationType;
  const status = reservation.status.toLowerCase();
  const paymentStatus = reservation.paymentSummary?.paymentStatus;
  const guests = (reservation.numberOfAdults ?? 0) + (reservation.numberOfChildren ?? 0);
  const dateRange =
    reservation.checkInDate && reservation.checkOutDate
      ? `${reservation.checkInDate} → ${reservation.checkOutDate}`
      : reservation.checkInDate ?? reservation.serviceDate ?? "—";

  return (
    <div className="next-trip-hero">
      <div className="next-trip-hero-media">
        <Image src="/images/camp-hero-poster.jpg" alt="" fill sizes="(max-width: 900px) 100vw, 420px" />
      </div>
      <div className="next-trip-hero-body">
        <p className="next-trip-hero-eyebrow">{t("yourNextExperience")}</p>
        <h2 className="next-trip-hero-title">{title}</h2>
        <p className="next-trip-hero-ref">
          {t("bookingRefLabel")} {bookingReference(reservation)}
        </p>

        <div className="next-trip-hero-facts">
          <span>{dateRange}</span>
          {guests > 0 && (
            <span>
              {guests} {t("guestsLabel")}
            </span>
          )}
        </div>

        <div className="next-trip-hero-badges">
          <span className="status-pill" data-status={status}>
            {t.has(`status.${status}` as never) ? t(`status.${status}` as never) : status}
          </span>
          {paymentStatus && (
            <span className="status-pill" data-status={paymentStatus === "PAID" ? "confirmed" : "pending"}>
              {t.has(`paymentStatus.${paymentStatus}` as never)
                ? t(`paymentStatus.${paymentStatus}` as never)
                : paymentStatus}
            </span>
          )}
        </div>

        <div className="next-trip-hero-footer">
          <span className="next-trip-hero-total">
            {reservation.totalAmount} {reservation.currency}
          </span>
          <Link href="/account/bookings" className="btn-accent" style={{ padding: "12px 26px" }}>
            {t("viewYourTrip")} →
          </Link>
        </div>
      </div>
    </div>
  );
}

function NoTripCta({ t }: { t: T }) {
  return (
    <div className="next-trip-empty">
      <Link href="/camp" className="btn-accent">
        {t("exploreExperiencesCta")} →
      </Link>
    </div>
  );
}

function GlanceIcon({ name }: { name: "calendar" | "guests" | "payment" | "location" }) {
  const paths: Record<string, React.ReactNode> = {
    calendar: (
      <>
        <rect x="4" y="5.5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 10h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
    guests: (
      <>
        <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 19c1.2-3.2 3.8-4.8 6-4.8s4.8 1.6 6 4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="17" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15.5 14.5c1.9.2 3.6 1.6 4.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
    payment: (
      <>
        <rect x="3.5" y="6" width="17" height="12.5" rx="2.3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 10.3h17" stroke="currentColor" strokeWidth="1.6" />
      </>
    ),
    location: (
      <>
        <path
          d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      </>
    ),
  };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {paths[name]}
    </svg>
  );
}

function TripAtAGlance({ reservation, t }: { reservation: MyReservation; t: T }) {
  const guests = (reservation.numberOfAdults ?? 0) + (reservation.numberOfChildren ?? 0);
  const dateRange =
    reservation.checkInDate && reservation.checkOutDate
      ? `${reservation.checkInDate} → ${reservation.checkOutDate}`
      : reservation.checkInDate ?? reservation.serviceDate ?? "—";
  const paid = reservation.paymentSummary?.paymentStatus === "PAID";

  const items: Array<{ icon: "calendar" | "guests" | "payment" | "location"; value: string; note: string }> = [
    { icon: "calendar", value: dateRange, note: t("glanceDatesLabel") },
    ...(guests > 0
      ? [{ icon: "guests" as const, value: `${guests} ${t("guestsLabel")}`, note: t("glanceGuestsLabel") }]
      : []),
    {
      icon: "payment",
      value: paid ? t("paymentStatus.PAID" as never) : t("paymentStatus.UNPAID" as never),
      note: paid ? t("glancePaymentDoneNote") : t("glancePaymentPendingNote"),
    },
    { icon: "location", value: t("glanceLocationLabel"), note: site.name },
  ];

  return (
    <div className="dash-section">
      <h2 className="dash-section-title">{t("glanceTitle")}</h2>
      <div className="glance-grid">
        {items.map((item, i) => (
          <div className="glance-item" key={i}>
            <span className="glance-icon">
              <GlanceIcon name={item.icon} />
            </span>
            <div>
              <div className="glance-value">{item.value}</div>
              <div className="glance-note">{item.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function YourJourney({ stepIndex, t }: { stepIndex: number; t: T }) {
  const steps = [
    t("journey.received"),
    t("journey.confirmed"),
    t("journey.prepare"),
    t("journey.enjoy"),
    t("journey.share"),
  ];

  return (
    <div className="dash-section">
      <h2 className="dash-section-title">{t("journeyTitle")}</h2>
      <div className="journey-track">
        {steps.map((label, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "upcoming";
          return (
            <div className="journey-step" data-state={state} key={i}>
              <span className="journey-dot" aria-hidden="true">
                {state === "done" ? "✓" : ""}
              </span>
              <span className="journey-label">{label}</span>
              {i < steps.length - 1 && <span className="journey-line" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BeforeYourTrip({ t }: { t: T }) {
  const cards = [
    {
      href: "/guides/que-faut-il-emporter-desert",
      title: t("beforeTripPacking"),
      desc: t("beforeTripPackingDesc"),
    },
    {
      href: "/account/support",
      title: t("beforeTripHelp"),
      desc: t("beforeTripHelpDesc"),
    },
    {
      href: "/account/bookings",
      title: t("beforeTripDetails"),
      desc: t("beforeTripDetailsDesc"),
    },
  ];

  return (
    <div className="dash-section">
      <h2 className="dash-section-title">{t("beforeTripTitle")}</h2>
      <p className="dash-section-lead">{t("beforeTripLead")}</p>
      <div className="before-trip-grid">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="before-trip-card">
            <div className="before-trip-card-title">{c.title}</div>
            <div className="before-trip-card-desc">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Recommendations({
  activities,
  t,
}: {
  activities: Awaited<ReturnType<typeof getActivities>>;
  t: T;
}) {
  return (
    <div className="dash-section">
      <h2 className="dash-section-title">{t("recommendTitle")}</h2>
      <p className="dash-section-lead">{t("recommendLead")}</p>
      <div className="recommend-grid">
        {activities.map((a) => (
          <Link key={a.slug} href={`/activities/${a.slug}`} className="recommend-card">
            <div className="recommend-card-media">
              <Image src={a.cardImage} alt={a.title} fill sizes="(max-width: 900px) 100vw, 33vw" />
            </div>
            <div className="recommend-card-body">
              <div className="recommend-card-title">{a.title}</div>
              <p className="recommend-card-tagline">{a.tagline}</p>
              <span className="recommend-card-cta">{t("discoverCta")} →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NeedHelp({ t }: { t: T }) {
  const waNumber = site.whatsapp.replace(/[^\d]/g, "");
  const waText = encodeURIComponent("Hello Dunes Insolites! I have a question about my booking.");

  return (
    <div className="dash-section need-help-section">
      <div>
        <h2 className="dash-section-title" style={{ marginBottom: 4 }}>
          {t("helpTitle")}
        </h2>
        <p className="dash-section-lead" style={{ marginBottom: 0 }}>
          {t("helpLead")}
        </p>
      </div>
      <div className="need-help-actions">
        <Link href="/account/support" className="btn-ghost">
          {t("contactSupportCta")}
        </Link>
        <a href={`https://wa.me/${waNumber}?text=${waText}`} target="_blank" rel="noreferrer" className="btn-accent">
          {t("whatsappCta")}
        </a>
      </div>
    </div>
  );
}
