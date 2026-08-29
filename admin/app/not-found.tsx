import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Introuvable" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="card max-w-sm rounded-2xl p-8 text-center">
        <p className="text-4xl">🧭</p>
        <h1 className="mt-3 text-lg font-bold text-navy-800">Page introuvable</h1>
        <p className="mt-1.5 text-sm text-navy-700/60">
          Cet écran n&apos;existe pas ou a été déplacé.
        </p>
        <Link href="/" className="btn btn-primary mt-6 inline-block">
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}
