import { getTranslations } from "next-intl/server";
import ContactForm from "@/components/ContactForm";

export default async function AccountSupportPage() {
  const t = await getTranslations("account");

  return (
    <div className="book-card" style={{ maxWidth: 640 }}>
      <h2>{t("supportTitle")}</h2>
      <p className="hint">{t("supportLead")}</p>
      <div style={{ marginTop: 24 }}>
        <ContactForm />
      </div>
    </div>
  );
}
