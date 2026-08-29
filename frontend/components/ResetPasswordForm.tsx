"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resetPassword } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function ResetPasswordForm({ token }: { token: string | undefined }) {
  const t = useTranslations("resetPasswordPage");
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "invalid">("idle");

  // No token in the URL at all - someone navigated here directly rather
  // than through a real email link. Same "invalid" screen as a rejected
  // token, since neither case has anything left to submit.
  if (!token) {
    return (
      <div className="alert" style={{ marginTop: 24 }}>
        <strong>{t("invalidTitle")}</strong> {t("invalidBody")}
        <div className="hero-ctas" style={{ marginTop: 14 }}>
          <Link href="/forgot-password" className="cta-primary">
            {t("requestNewLink")}
          </Link>
        </div>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="alert" style={{ marginTop: 24 }}>
        <strong>{t("invalidTitle")}</strong> {t("invalidBody")}
        <div className="hero-ctas" style={{ marginTop: 14 }}>
          <Link href="/forgot-password" className="cta-primary">
            {t("requestNewLink")}
          </Link>
        </div>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="alert ok" style={{ marginTop: 24 }}>
        <strong>{t("successTitle")}</strong> {t("successBody")}
        <div className="hero-ctas" style={{ marginTop: 14 }}>
          <Link href="/login" className="cta-primary">
            {t("goToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("atLeast8Chars"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    setState("submitting");
    const result = await resetPassword(token as string, password);
    if (result.ok) {
      toast.success(t("successTitle"));
      setState("done");
      return;
    }
    // The backend deliberately returns one generic "invalid or expired"
    // message for every failure mode (see InvalidTokenException's own
    // comment) - a used, expired, or nonexistent token all land here.
    setState("invalid");
  }

  return (
    <form onSubmit={onSubmit} className="auth-form">
      <div className="field">
        <label htmlFor="rp-password">{t("newPasswordLabel")}</label>
        <input
          id="rp-password"
          type="password"
          value={password}
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="rp-confirm">{t("confirmPasswordLabel")}</label>
        <input
          id="rp-confirm"
          type="password"
          value={confirm}
          autoComplete="new-password"
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error && <div className="alert">{error}</div>}

      <button type="submit" className="btn-accent auth-submit" disabled={state === "submitting"}>
        {state === "submitting" ? t("submittingButton") : t("submitButton")}
      </button>
    </form>
  );
}
