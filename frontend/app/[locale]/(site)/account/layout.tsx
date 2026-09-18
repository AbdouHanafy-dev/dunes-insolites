import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getMyReservations } from "@/lib/api";
import AccountNav from "@/components/AccountNav";

// Found live: this whole area reads the session cookie per-request (auth
// gating, driver vs. client nav) but was being served from Next's route
// cache regardless - a stale response for one visitor's session (or no
// session at all) kept getting replayed to the next. cookies() is supposed
// to opt a route out of caching automatically; forcing it explicitly is
// the documented escape hatch when that inference doesn't kick in.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.account" });
  return { title: t("title"), robots: { index: false } };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // CHAUFFEUR accounts have no reservations of their own - my-reservations
  // is CLIENT/PARTENAIRE-only server-side (403s otherwise), so skip it
  // entirely instead of making a call the backend would just refuse.
  const driverMode = session.role === "CHAUFFEUR";

  // Real counts for the sidebar's context lines, computed once here so
  // every /account/* page shares the same numbers instead of each
  // re-deriving its own - the exact same reservation data the overview
  // and payments pages already fetch, not a second source of truth.
  const reservations = driverMode ? [] : await getMyReservations(session.accessToken);
  const today = todayISO();
  const upcomingCount = reservations.filter((r) => {
    if (r.status === "CANCELLED" || r.status === "REJECTED") return false;
    const date = r.checkInDate ?? r.serviceDate;
    return date !== null && date >= today;
  }).length;
  const actionRequiredCount = reservations.filter((r) => {
    const paymentStatus = r.paymentSummary?.paymentStatus;
    return (
      r.status !== "CANCELLED" &&
      r.status !== "REJECTED" &&
      (paymentStatus === "UNPAID" || paymentStatus === "PARTIALLY_PAID" || paymentStatus === "OVERDUE")
    );
  }).length;

  return (
    <section className="book-page">
      <div className="wrap account-shell">
        <AccountNav
          name={session.name}
          upcomingCount={upcomingCount}
          actionRequiredCount={actionRequiredCount}
          driverMode={driverMode}
        />
        <div className="account-content">{children}</div>
      </div>
    </section>
  );
}
