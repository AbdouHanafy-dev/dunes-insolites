"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { verifyEmail } from "@/lib/api";

export default function VerifyEmailStatus({ token }: { token: string | undefined }) {
  const t = useTranslations("verifyEmailPage");
  const [state, setState] = useState<"checking" | "ok" | "error">(token ? "checking" : "error");

  useEffect(() => {
    if (!token) return;
    // Deferred into a microtask rather than called synchronously in the
    // effect body - same react-hooks/set-state-in-effect fix used
    // elsewhere this session (NotificationBell.tsx, MaintenanceCountdown.tsx).
    Promise.resolve().then(async () => {
      const result = await verifyEmail(token);
      setState(result.ok ? "ok" : "error");
    });
  }, [token]);

  if (state === "checking") {
    return <p className="hero-sub" style={{ margin: "22px auto 0" }}>{t("verifying")}</p>;
  }

  if (state === "error") {
    return (
      <>
        <p className="hero-sub" style={{ margin: "22px auto 0" }}>{t("errorBody")}</p>
        <div className="hero-ctas">
          <Link href="/" className="cta-primary">
            {t("continueButton")}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="hero-sub" style={{ margin: "22px auto 0" }}>{t("successBody")}</p>
      <div className="hero-ctas">
        <Link href="/" className="cta-primary">
          {t("continueButton")}
        </Link>
      </div>
    </>
  );
}
