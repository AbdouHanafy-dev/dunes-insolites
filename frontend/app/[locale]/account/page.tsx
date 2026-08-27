import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/session";

export default async function AccountPage() {
  const t = await getTranslations("account");
  const session = await getSession();
  if (!session) return null; // layout already redirects; keeps this render branch simple

  const roleLabel = t.has(`role.${session.role}` as never)
    ? t(`role.${session.role}` as never)
    : session.role;

  return (
    <div className="book-card" style={{ maxWidth: 640 }}>
      <h2>{t("overviewTitle")}</h2>
      <p className="hint">{t("overviewLead")}</p>

      <div className="ticket" style={{ marginTop: 32, boxShadow: "none", padding: 0, border: 0 }}>
        <div className="rows">
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
    </div>
  );
}
