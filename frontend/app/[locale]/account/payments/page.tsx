import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";
import { getMyReservations } from "@/lib/api";

export default async function AccountPaymentsPage() {
  const t = await getTranslations("account");
  const session = await getSession();
  if (!session) return null;

  const reservations = await getMyReservations(session.accessToken);
  const withPayments = reservations.filter((r) => r.paymentSummary || r.transactions.length > 0);

  return (
    <div className="book-card">
      <h2>{t("paymentsTitle")}</h2>
      <p className="hint">{t("paymentsLead")}</p>

      {withPayments.length === 0 ? (
        <p className="account-empty">{t("paymentsEmpty")}</p>
      ) : (
        <div className="account-list" style={{ marginTop: 32 }}>
          {withPayments.map((r) => {
            const label = [...r.tourTypes, ...r.tours][0]?.name ?? r.reservationType;
            const summary = r.paymentSummary;
            return (
              <div
                key={r.reservationId}
                className="ticket"
                style={{ maxWidth: "none", boxShadow: "none", padding: "28px 32px" }}
              >
                <span className="ref" style={{ fontSize: "1.4rem" }}>
                  {label}
                </span>
                {summary && (
                  <div className="rows">
                    <div>
                      <div className="k">{t("totalDueLabel")}</div>
                      <div className="v">
                        {summary.originalTotalAmount} {r.currency}
                      </div>
                    </div>
                    <div>
                      <div className="k">{t("totalPaidLabel")}</div>
                      <div className="v">
                        {summary.totalPaid} {r.currency}
                      </div>
                    </div>
                    <div>
                      <div className="k">{t("remainingLabel")}</div>
                      <div className="v">
                        {summary.remainingTotal} {r.currency}
                      </div>
                    </div>
                    <div>
                      <div className="k">{t("paymentStatusLabel")}</div>
                      <div className="v" style={{ textTransform: "capitalize" }}>
                        {summary.paymentStatus.toLowerCase().replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>
                )}
                {r.transactions.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div className="k">{t("transactionsLabel")}</div>
                    <ul style={{ marginTop: 10, paddingInlineStart: 18 }}>
                      {r.transactions.map((tx) => (
                        <li key={tx.transactionId} style={{ marginBottom: 6 }}>
                          {new Date(tx.transactionDate).toLocaleDateString()} — {tx.amount} {tx.currency} (
                          {tx.paymentMethod.toLowerCase()}, {tx.status.toLowerCase()})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
