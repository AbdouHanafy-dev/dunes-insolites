"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { login, register } from "@/lib/api";
import { adminAppUrl } from "@/lib/site";

type Mode = "login" | "signup";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthForm({ mode }: { mode: Mode }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const t = useTranslations("authForm");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (isSignup && !name.trim()) e.name = t("nameRequired");
    if (!email.trim()) e.email = t("emailRequired");
    else if (!EMAIL.test(email.trim())) e.email = t("emailInvalid");
    if (!password) e.password = t("passwordRequired");
    else if (isSignup && password.length < 8) e.password = t("passwordTooShort");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError("");
    if (!validate()) return;

    setBusy(true);
    const result = isSignup
      ? await register({ name: name.trim(), email: email.trim(), password })
      : await login({ email: email.trim(), password });

    if (result.ok) {
      // Staff/partner roles have no home in this app yet (the real
      // backoffice is R3, docs/ROADMAP.md) — send them to the existing
      // Angular admin app rather than into the client-only account area.
      // A full navigation (not the i18n router) since this is a different
      // origin/app entirely.
      if (result.data.role !== "CLIENT") {
        window.location.href = adminAppUrl;
        return;
      }
      // refresh() re-runs the server components so they see the session
      // cookie the backend just set.
      router.push("/account");
      router.refresh();
      return;
    }
    setErrors(result.errors ?? {});
    setFormError(result.message ?? t("defaultError"));
    setBusy(false);
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      {isSignup && (
        <div className="field" data-invalid={!!errors.name}>
          <label htmlFor="name">{t("fullNameLabel")}</label>
          <input
            id="name"
            value={name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && <span className="err">{errors.name}</span>}
        </div>
      )}

      <div className="field" data-invalid={!!errors.email}>
        <label htmlFor="email">{t("emailLabel")}</label>
        <input
          id="email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        {errors.email && <span className="err">{errors.email}</span>}
      </div>

      <div className="field" data-invalid={!!errors.password}>
        <label htmlFor="password">{t("passwordLabel")}</label>
        <div className="pw">
          <input
            id="password"
            type={show ? "text" : "password"}
            value={password}
            autoComplete={isSignup ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="pw-toggle"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? t("hide") : t("show")}
          >
            {show ? t("hide") : t("show")}
          </button>
        </div>
        {errors.password && <span className="err">{errors.password}</span>}
        {isSignup && !errors.password && (
          <span className="hint-sm">{t("atLeast8Chars")}</span>
        )}
      </div>

      {!isSignup && (
        <div className="auth-row">
          <Link href="/contact" className="link-quiet">
            {t("forgotPassword")}
          </Link>
        </div>
      )}

      {formError && <div className="alert">{formError}</div>}

      <button type="submit" className="btn-accent auth-submit" disabled={busy}>
        {busy ? t("oneMoment") : isSignup ? t("createAccount") : t("login")}
      </button>

      <p className="auth-swap">
        {isSignup ? (
          <>
            {t("alreadyHaveAccount")} <Link href="/login">{t("login")}</Link>
          </>
        ) : (
          <>
            {t("noAccountYet")} <Link href="/signup">{t("signUp")}</Link>
          </>
        )}
      </p>

      <p className="auth-note">
        {t("guestNotePre")}
        <Link href="/book">{t("guestNoteLink")}</Link>
        {t("guestNotePost")}
      </p>
    </form>
  );
}
