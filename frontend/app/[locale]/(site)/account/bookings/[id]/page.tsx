import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMyReservationById } from "@/lib/api";
import { Link } from "@/i18n/navigation";

export default async function AccountBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("account");
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const reservation = await getMyReservationById(session.accessToken, id);
  if (!reservation) notFound();

  const lines = [...reservation.tourTypes, ...reservation.tours];
  const date = reservation.checkInDate ?? reservation.serviceDate;
  const status = reservation.status.toLowerCase();

  return (
    <div className="book-card">
      <Link href="/account/bookings" className="account-booking-link" style={{ marginTop: 0, marginBottom: 20 }}>
        ← {t("backToBookings")}
      </Link>

      <div className="account-booking-top">
        <div className="account-booking-heading">
          <div>
            <div className="account-booking-title">{lines[0]?.name ?? reservation.reservationType}</div>
            <div className="account-booking-sub">
              {t.has(`reservationType.${reservation.reservationType}` as never)
                ? t(`reservationType.${reservation.reservationType}` as never)
                : reservation.reservationType}
            </div>
          </div>
        </div>
        <span className="status-pill" data-status={status}>
          {t.has(`status.${status}` as never) ? t(`status.${status}` as never) : status}
        </span>
      </div>

      <div className="account-booking-grid">
        <div>
          <div className="k">{t("dateLabel")}</div>
          <div className="v">{date ?? "—"}</div>
        </div>
        <div>
          <div className="k">{t("guestsLabel")}</div>
          <div className="v">{(reservation.numberOfAdults ?? 0) + (reservation.numberOfChildren ?? 0)}</div>
        </div>
        <div>
          <div className="k">{t("totalLabel")}</div>
          <div className="v">
            {reservation.grandTotalAmount} {reservation.currency}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(42, 21, 16, 0.08)" }}>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>{t("teamTitle")}</h3>
        <p className="hint" style={{ marginTop: 4 }}>
          {t("teamLead")}
        </p>

        <div style={{ marginTop: 18, display: "grid", gap: 16, gridTemplateColumns: "repeat(2, 1fr)" }}>
          <div>
            <div className="k">{t("guideLabel")}</div>
            {reservation.guides.length === 0 ? (
              <p className="hint" style={{ marginTop: 4 }}>
                {t("noGuideYet")}
              </p>
            ) : (
              reservation.guides.map((g) => (
                <div key={g.guideId} className="v" style={{ marginTop: 4 }}>
                  {g.firstName} {g.lastName}
                  {g.phoneNumber && (
                    <div className="hint">
                      {t("phoneLabel")}: {g.phoneNumber}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div>
            <div className="k">{t("chauffeurLabel")}</div>
            {reservation.chauffeurs.length === 0 ? (
              <p className="hint" style={{ marginTop: 4 }}>
                {t("noChauffeurYet")}
              </p>
            ) : (
              reservation.chauffeurs.map((c) => (
                <div key={c.chauffeurId} className="v" style={{ marginTop: 4 }}>
                  {c.firstName} {c.lastName}
                  {c.phoneNumber && (
                    <div className="hint">
                      {t("phoneLabel")}: {c.phoneNumber}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
