import type { Metadata, Viewport } from "next";
import { alexandria, inter } from "./fonts";
import { getActivities, getStays } from "@/lib/api";
import { site } from "@/lib/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import WhatsAppButton from "@/components/WhatsAppButton";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Sabria Desert Adventures`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  keywords: [
    "Sahara",
    "Tunisia",
    "camel trek",
    "quad safari",
    "sandboarding",
    "Douz",
    "Sabria",
    "desert tour",
  ],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — Sabria Desert Adventures`,
    description: site.description,
    url: site.url,
    images: [{ url: "/images/under-hero.jpg", width: 1600, height: 1200, alt: site.tagline }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Sabria Desert Adventures`,
    description: site.description,
    images: ["/images/under-hero.jpg"],
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#2a1008",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The Experiences and Stay mega-menus are built from the live lists.
  const [activities, stays] = await Promise.all([getActivities(), getStays()]);

  return (
    <html
      lang="en"
      className={`${alexandria.variable} ${inter.variable}`}
    >
      <body>
        <Header activities={activities} stays={stays} />
        <main>{children}</main>
        <Footer />
        <WhatsAppButton />
        <CookieConsent />
      </body>
    </html>
  );
}
