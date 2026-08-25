"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login, register } from "@/lib/api";

type Mode = "login" | "signup";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthForm({ mode }: { mode: Mode }) {
  const isSignup = mode === "signup";
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (isSignup && !name.trim()) e.name = "Tell us what to call you.";
    if (!email.trim()) e.email = "We need your email.";
    else if (!EMAIL.test(email.trim())) e.email = "That email looks off.";
    if (!password) e.password = "Enter your password.";
    else if (isSignup && password.length < 8)
      e.password = "Use at least 8 characters.";
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
      // refresh() re-runs the server components so they see the session
      // cookie the backend just set.
      router.push("/");
      router.refresh();
      return;
    }
    setErrors(result.errors ?? {});
    setFormError(result.message ?? "Something went wrong. Try again.");
    setBusy(false);
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      {isSignup && (
        <div className="field" data-invalid={!!errors.name}>
          <label htmlFor="name">Full name</label>
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
        <label htmlFor="email">Email</label>
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
        <label htmlFor="password">Password</label>
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
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        {errors.password && <span className="err">{errors.password}</span>}
        {isSignup && !errors.password && (
          <span className="hint-sm">At least 8 characters.</span>
        )}
      </div>

      {!isSignup && (
        <div className="auth-row">
          <Link href="/contact" className="link-quiet">
            Forgotten your password?
          </Link>
        </div>
      )}

      {formError && <div className="alert">{formError}</div>}

      <button type="submit" className="btn-accent auth-submit" disabled={busy}>
        {busy ? "One moment…" : isSignup ? "Create account" : "Log in"}
      </button>

      <p className="auth-swap">
        {isSignup ? (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            No account yet? <Link href="/signup">Sign up</Link>
          </>
        )}
      </p>

      <p className="auth-note">
        You don&apos;t need an account to book — <Link href="/book">book as a guest</Link>{" "}
        any time.
      </p>
    </form>
  );
}
