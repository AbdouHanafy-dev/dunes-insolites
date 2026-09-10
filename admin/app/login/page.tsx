import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Connexion" };

const ERRORS: Record<string, string> = {
  no_backoffice_access: "Ce compte n’a pas accès au backoffice.",
  state_mismatch: "Session de connexion expirée. Réessayez.",
  invalid_state: "Session de connexion expirée. Réessayez.",
  token_exchange_failed: "Connexion impossible. Réessayez.",
  invalid_request: "Requête de connexion invalide.",
  access_denied: "Connexion annulée.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSession()) redirect("/");
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? "Connexion impossible.") : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="card relative w-full max-w-[440px] rounded-[20px] border border-navy-700/8 p-10 pb-8 text-center">
        <div className="mx-auto mb-3.5 flex h-17 w-17 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-gold to-gold-light shadow-[0_6px_20px_rgba(197,155,61,0.30)]">
          <span className="text-2xl">🏜️</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-800">Dunes Insolites</h1>
        <p className="mt-1 text-sm text-navy-700/50">Backoffice</p>

        {message && (
          <div className="mt-6 rounded-[10px] border border-rose/25 bg-rose/8 px-4 py-3 text-[14px] text-rose">
            {message}
          </div>
        )}

        <Link
          href="/api/auth/login"
          prefetch={false}
          className="mt-7 flex min-h-12 items-center justify-center rounded-[9px] bg-gradient-to-br from-gold to-gold-light font-bold text-navy-950 shadow-[0_4px_18px_rgba(197,155,61,0.36)] transition hover:shadow-[0_8px_26px_rgba(197,155,61,0.48)]"
        >
          Se connecter
        </Link>
        <p className="mt-4 text-[12px] text-navy-700/45">
          Vous serez redirigé vers la page de connexion sécurisée.
        </p>
      </div>
    </div>
  );
}
