"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordForm() {
  const t = useTranslations("forgotPasswordPage");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    // Always shows the same success state regardless of whether the
    // address matches a real account - the backend's own response can't
    // tell the difference either (see AccountActionServiceImpl.
    // requestPasswordReset's comment on why), so there is nothing more
    // specific to show here even on a genuine network failure.
    await requestPasswordReset(email);
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="alert ok" style={{ marginTop: 24 }}>
        <strong>{t("successTitle")}</strong> {t("successBody")}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="auth-form">
      <div className="field">
        <label htmlFor="fp-email">{t("emailLabel")}</label>
        <input
          id="fp-email"
          type="email"
          value={email}
          autoComplete="email"
          required
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button type="submit" className="btn-accent auth-submit" disabled={state === "sending"}>
        {state === "sending" ? t("sendingButton") : t("sendButton")}
      </button>

      <p className="auth-swap">
        <Link href="/login">{t("backToLogin")}</Link>
      </p>
    </form>
  );
}
