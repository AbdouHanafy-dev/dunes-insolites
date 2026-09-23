"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Catches a render/runtime error anywhere under the root layout — the
 * backoffice had no error boundary at all before this, so any unhandled
 * exception in a collection editor or dashboard widget took the whole
 * screen to a blank white page with no way back except reloading.
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="card max-w-sm rounded-2xl p-8 text-center">
        <p className="text-4xl text-gold"><i className="bi bi-exclamation-triangle" aria-hidden /></p>
        <h1 className="mt-3 text-lg font-bold text-navy-800">Une erreur est survenue</h1>
        <p className="mt-1.5 text-sm text-navy-700/60">
          Cet écran a rencontré un problème. Vous pouvez réessayer, ou retourner au tableau de bord.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={() => reset()} className="btn btn-primary">
            Réessayer
          </button>
          <Link href="/" className="btn btn-secondary">
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
