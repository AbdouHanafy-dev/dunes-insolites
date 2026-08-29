import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getMyReservations } from "@/lib/api";

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
            return (
              <div
                key={r.reservationId}
                className="ticket"
                style={{ maxWidth: "none", boxShadow: "none", padding: "28px 32px" }}
              >
                <span className="ref" style={{ fontSize: "1.4rem" }}>
                  {lines[0]?.name ?? r.reservationType}
                </span>
                <div className="rows">
                  <div>
                    <div className="k">{t("statusLabel")}</div>
                    <div className="v" style={{ textTransform: "capitalize" }}>
                      {r.status.toLowerCase()}
                    </div>
                  </div>
                  <div>
                    <div className="k">{t("dateLabel")}</div>
                    <div className="v">{date ?? "—"}</div>
                  </div>
                  <div>
                    <div className="k">{t("totalLabel")}</div>
                    <div className="v">
                      {r.totalAmount} {r.currency}
                    </div>
                  </div>
                  <div>
                    <div className="k">{t("bookedOnLabel")}</div>
                    <div className="v">{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
