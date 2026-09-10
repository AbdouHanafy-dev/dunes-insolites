import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";

/**
 * Moved out of the overview (customer-area redesign, second pass, 31 Aug
 * 2026) - a name/email/account-type table doesn't deserve the dashboard's
 * primary real estate; the overview is about the trip, not account
 * metadata. This is now the only place it lives.
 */
export default async function AccountProfilePage() {
  const t = await getTranslations("account");
  const session = await getSession();
  if (!session) return null;

  const roleLabel = t.has(`role.${session.role}` as never)
    ? t(`role.${session.role}` as never)
    : session.role;

  return (
    <div className="book-card" style={{ maxWidth: 640 }}>
      <h2>{t("overviewTitle")}</h2>
      <p className="hint">{t("overviewLead")}</p>

      <div className="account-booking-grid" style={{ marginTop: 28, paddingTop: 24 }}>
        <div>
          <div className="k">{t("nameLabel")}</div>
          <div className="v">{session.name}</div>
        </div>
        <div>
          <div className="k">{t("emailLabel")}</div>
          <div className="v">{session.email}</div>
        </div>
        <div>
          <div className="k">{t("roleLabel")}</div>
          <div className="v">{roleLabel}</div>
        </div>
      </div>
    </div>
  );
}
