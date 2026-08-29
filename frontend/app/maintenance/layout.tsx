import type { Metadata } from "next";
import { alexandria, inter } from "../fonts";
import "../globals.css";

/**
 * Its own root layout, deliberately outside app/[locale]/ — this route is
 * reached by a middleware rewrite for a page that could be in any locale
 * (see middleware.ts), so it can't live inside the [locale] tree, which
 * means it can't inherit app/[locale]/layout.tsx's <html>/<body>. Next.js
 * requires exactly one root layout per route tree with no shared ancestor,
 * so this is that layout, kept intentionally minimal — no header, footer,
 * or NextIntlClientProvider; MaintenancePage carries its own tiny inline
 * dictionary instead (see its own comment for why).
 */
export const metadata: Metadata = {
  title: "Maintenance",
  robots: { index: false, follow: false },
};

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${alexandria.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
