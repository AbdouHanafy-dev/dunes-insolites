import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getMyReservations } from "@/lib/api";
import AccountNav from "@/components/AccountNav";

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

  // Real counts for the sidebar's context lines, computed once here so
  // every /account/* page shares the same numbers instead of each
  // re-deriving its own - the exact same reservation data the overview
  // and payments pages already fetch, not a second source of truth.
  const reservations = await getMyReservations(session.accessToken);
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
        <AccountNav name={session.name} upcomingCount={upcomingCount} actionRequiredCount={actionRequiredCount} />
        <div className="account-content">{children}</div>
      </div>
    </section>
  );
}
