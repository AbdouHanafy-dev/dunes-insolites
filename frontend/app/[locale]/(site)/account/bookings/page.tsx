import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getMyReservations } from "@/lib/api";
import { Link } from "@/i18n/navigation";

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function AccountBookingsPage() {
  const t = await getTranslations("account");
  const session = await getSession();
  if (!session) return null;

  const reservations = await getMyReservations(session.accessToken);

  return (
    <div className="book-card">
      <h2>{t("bookingsTitle")}</h2>
      <p className="hint">{t("bookingsLead")}</p>

      {reservations.length === 0 ? (
        <p className="account-empty">{t("bookingsEmpty")}</p>
      ) : (
        <div className="account-list" style={{ marginTop: 32 }}>
          {reservations.map((r) => {
            const lines = [...r.tourTypes, ...r.tours];
            const date = r.checkInDate ?? r.serviceDate;
            const status = r.status.toLowerCase();
            return (
              <div key={r.reservationId} className="account-booking-card">
                <div className="account-booking-top">
                  <div className="account-booking-heading">
                    <span className="account-booking-icon">
                      <MoonIcon />
                    </span>
                    <div>
                      <div className="account-booking-title">
                        {lines[0]?.name ?? r.reservationType}
                      </div>
                      <div className="account-booking-sub">
                        {t.has(`reservationType.${r.reservationType}` as never)
                          ? t(`reservationType.${r.reservationType}` as never)
                          : r.reservationType}
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
                    <div className="k">{t("totalLabel")}</div>
                    <div className="v">
                      {r.grandTotalAmount} {r.currency}
                    </div>
                  </div>
                  <div>
                    <div className="k">{t("bookedOnLabel")}</div>
                    <div className="v">{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <Link href={`/account/bookings/${r.reservationId}`} className="account-booking-link">
                  {t("viewDetails")} →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
