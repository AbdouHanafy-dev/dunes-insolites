"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Connexion impossible.");
      setBusy(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[13px] font-medium text-navy-700/70">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-[9px] border border-navy-700/15 bg-surface-alt px-4 py-3 text-[15px] text-navy-800 outline-none transition placeholder:text-navy-700/30 focus:border-gold/60 focus:bg-white focus:ring-3 focus:ring-gold/15"
          placeholder="vous@dunes-insolites.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[13px] font-medium text-navy-700/70">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-[9px] border border-navy-700/15 bg-surface-alt px-4 py-3 text-[15px] text-navy-800 outline-none transition placeholder:text-navy-700/30 focus:border-gold/60 focus:bg-white focus:ring-3 focus:ring-gold/15"
        />
      </div>

      {error && (
        <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[14px] text-rose">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-1 flex min-h-12 items-center justify-center rounded-[9px] bg-gradient-to-br from-gold to-gold-light font-bold text-navy-950 shadow-[0_4px_18px_rgba(197,155,61,0.36)] transition hover:shadow-[0_8px_26px_rgba(197,155,61,0.48)] disabled:opacity-50"
      >
        {busy ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
