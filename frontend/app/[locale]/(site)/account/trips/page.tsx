import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getMyTrips } from "@/lib/api";

export default async function DriverTripsPage() {
  const t = await getTranslations("account");
  const session = await getSession();
  if (!session) return null;

  const trips = await getMyTrips(session.accessToken);

  return (
    <div className="book-card">
      <h2>{t("tripsTitle")}</h2>
      <p className="hint">{t("tripsLead")}</p>

      {trips.length === 0 ? (
        <p className="account-empty">{t("tripsEmpty")}</p>
      ) : (
        <div className="account-list" style={{ marginTop: 32 }}>
          {trips.map((trip) => {
            const status = trip.status.toLowerCase();
            const guests = (trip.numberOfAdults ?? 0) + (trip.numberOfChildren ?? 0);
            return (
              <div key={trip.chauffeurId} className="account-booking-card">
                <div className="account-booking-top">
                  <div className="account-booking-heading">
                    <div>
                      <div className="account-booking-title">{trip.tourName}</div>
                      {trip.groupLeaderName && (
                        <div className="account-booking-sub">{trip.groupLeaderName}</div>
                      )}
                    </div>
                  </div>
                  <span className="status-pill" data-status={status}>
                    {t.has(`status.${status}` as never) ? t(`status.${status}` as never) : status}
                  </span>
                </div>

                <div className="account-booking-grid">
                  <div>
                    <div className="k">{t("dateLabel")}</div>
                    <div className="v">{trip.serviceDate ?? "—"}</div>
                  </div>
                  {guests > 0 && (
                    <div>
                      <div className="k">{t("guestsLabel")}</div>
                      <div className="v">{guests}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
