"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { sendContact } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { trackFormSubmitted } from "@/lib/analytics";

export default function ContactForm() {
  const t = useTranslations("contactForm");
  const toast = useToast();
  const [values, setValues] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [formError, setFormError] = useState("");

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setErrors({});
    setFormError("");

    const result = await sendContact(values);
    if (result.ok) {
      trackFormSubmitted("contact");
      setState("sent");
      toast.success(t("sentTitle"));
      return;
    }
    setErrors(result.errors ?? {});
    setFormError(result.errors ? "" : (result.message ?? t("genericError")));
    setState("idle");
  }

  if (state === "sent") {
    return (
      <div className="alert ok" style={{ marginTop: 0 }}>
        <strong>{t("sentTitle")}</strong> {t("sentBody")}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-grid" style={{ marginTop: 0 }}>
        <div className="field" data-invalid={!!errors.name}>
          <label htmlFor="c-name">{t("nameLabel")}</label>
          <input id="c-name" value={values.name} onChange={set("name")} autoComplete="name" />
          {errors.name && <span className="err">{errors.name}</span>}
        </div>
        <div className="field" data-invalid={!!errors.email}>
          <label htmlFor="c-email">{t("emailLabel")}</label>
          <input
            id="c-email"
            type="email"
            value={values.email}
            onChange={set("email")}
            autoComplete="email"
          />
          {errors.email && <span className="err">{errors.email}</span>}
        </div>
        <div className="field span-2">
          <label htmlFor="c-subject">{t("subjectLabel")}</label>
          <input
            id="c-subject"
            value={values.subject}
            onChange={set("subject")}
            placeholder={t("subjectPlaceholder")}
          />
        </div>
        <div className="field span-2" data-invalid={!!errors.message}>
          <label htmlFor="c-message">{t("messageLabel")}</label>
          <textarea id="c-message" value={values.message} onChange={set("message")} />
          {errors.message && <span className="err">{errors.message}</span>}
        </div>
      </div>

      {formError && <div className="alert">{formError}</div>}

      <div className="book-actions">
        <button type="submit" className="btn-accent" disabled={state === "sending"}>
          {state === "sending" ? t("sendingButton") : t("sendButton")}
        </button>
      </div>
    </form>
  );
}
