"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { login, register } from "@/lib/api";
import { adminAppUrl } from "@/lib/site";
import { useToast } from "@/components/Toast";

type Mode = "login" | "signup";
type Field = "name" | "email" | "password" | "acceptTerms";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EyeIcon({ off }: { off: boolean }) {
  // Inline SVGs, matching this codebase's own icon convention (see
  // components/Header.tsx) rather than adding an icon-library dependency
  // for two glyphs.
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.5A10.6 10.6 0 0 1 12 5c6 0 10 6 10 6a15.7 15.7 0 0 1-3.4 3.9M6.5 6.6C4 8.3 2 12 2 12s2.2 4.4 6.1 6a10.7 10.7 0 0 0 3.9.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const t = useTranslations("authForm");
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  // One rule per field, shared by both onBlur (live feedback as someone
  // fills the form in) and onSubmit (the final gate) — a premium form
  // tells you something's wrong the moment you leave the field, not only
  // after you've filled in everything else and hit submit.
  function fieldError(field: Field): string {
    switch (field) {
      case "name":
        return isSignup && !name.trim() ? t("nameRequired") : "";
      case "email":
        if (!email.trim()) return t("emailRequired");
        return EMAIL.test(email.trim()) ? "" : t("emailInvalid");
      case "password":
        if (!password) return t("passwordRequired");
        return isSignup && password.length < 8 ? t("passwordTooShort") : "";
      case "acceptTerms":
        return isSignup && !acceptTerms ? t("termsRequired") : "";
    }
  }

  function onBlurField(field: Field) {
    const message = fieldError(field);
    setErrors((prev) => {
      if (!message) {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: message };
    });
  }

  function validate(): boolean {
    const fields: Field[] = isSignup
      ? ["name", "email", "password", "acceptTerms"]
      : ["email", "password"];
    const e: Record<string, string> = {};
    for (const field of fields) {
      const message = fieldError(field);
      if (message) e[field] = message;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError("");
    if (!validate()) return;

    setBusy(true);
    const result = isSignup
      ? await register({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          acceptedTerms: acceptTerms,
        })
      : await login({ email: email.trim(), password });

    if (result.ok) {
      toast.success(isSignup ? t("signupSuccess") : t("loginSuccess"));
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
            onBlur={() => onBlurField("name")}
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
          onBlur={() => onBlurField("email")}
        />
        {errors.email && <span className="err">{errors.email}</span>}
      </div>

      {isSignup && (
        <div className="field">
          <label htmlFor="phone">
            {t("phoneLabel")} <span className="hint-sm">({t("phoneOptional")})</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            autoComplete="tel"
            onChange={(e) => setPhone(e.target.value)}
          />
          <span className="hint-sm">{t("phoneHint")}</span>
        </div>
      )}

      <div className="field" data-invalid={!!errors.password}>
        <label htmlFor="password">{t("passwordLabel")}</label>
        <div className="pw">
          <input
            id="password"
            type={show ? "text" : "password"}
            value={password}
            autoComplete={isSignup ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => onBlurField("password")}
          />
          <button
            type="button"
            className="pw-toggle"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? t("hide") : t("show")}
            title={show ? t("hide") : t("show")}
          >
            <EyeIcon off={show} />
          </button>
        </div>
        {errors.password && <span className="err">{errors.password}</span>}
        {isSignup && !errors.password && (
          <span className="hint-sm">{t("atLeast8Chars")}</span>
        )}
      </div>

      {!isSignup && (
        <div className="auth-row">
          <Link href="/forgot-password" className="link-quiet">
            {t("forgotPassword")}
          </Link>
        </div>
      )}

      {isSignup && (
        <div className="auth-checkbox-field" data-invalid={!!errors.acceptTerms}>
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => {
                setAcceptTerms(e.target.checked);
                setErrors((prev) => {
                  if (!("acceptTerms" in prev)) return prev;
                  const next = { ...prev };
                  delete next.acceptTerms;
                  return next;
                });
              }}
            />
            <span>
              {t("termsPre")}
              <Link href="/legal/terms">{t("termsLinkTerms")}</Link>
              {t("termsMid")}
              <Link href="/legal/privacy">{t("termsLinkPrivacy")}</Link>
              {t("termsPost")}
            </span>
          </label>
          {errors.acceptTerms && <span className="err">{errors.acceptTerms}</span>}
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
