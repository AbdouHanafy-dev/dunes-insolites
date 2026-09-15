import type { Metadata } from "next";
import { inter, alexandria } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Backoffice — Dunes Insolites",
    template: "%s — Backoffice",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${alexandria.variable}`}>
      <body>{children}</body>
    </html>
  );
}
