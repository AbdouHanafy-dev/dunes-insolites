import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { alexandria, inter } from "../fonts";
import { getActivities, getStays, getNavigation } from "@/lib/api";
import { site, nav as staticNav } from "@/lib/site";
import { routing, isRtl } from "@/i18n/routing";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import WhatsAppButton from "@/components/WhatsAppButton";
import { ToastProvider } from "@/components/Toast";
import "../globals.css";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "site" });

  // hreflang for every locale, including x-default → French (the
  // unprefixed root). Matches DI-022/DI-025's canonical scheme: only the
  // path segment changes per locale, never the legacy French slugs.
  const languages: Record<string, string> = { "x-default": site.url };
  for (const l of routing.locales) {
    languages[l] = l === routing.defaultLocale ? site.url : `${site.url}/${l}`;
  }

  return {
    metadataBase: new URL(site.url),
    title: {
      default: `${site.name} — Sabria Desert Adventures`,
      template: `%s — ${site.name}`,
    },
    description: t("description"),
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
      description: t("description"),
      url: site.url,
      images: [{ url: "/images/under-hero.jpg", width: 1600, height: 1200, alt: site.tagline }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.name} — Sabria Desert Adventures`,
      description: t("description"),
      images: ["/images/under-hero.jpg"],
    },
    alternates: {
      canonical: locale === routing.defaultLocale ? "/" : `/${locale}`,
      languages,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#2a1008",
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for this locale (next-intl App Router docs) -
  // without this every page under [locale] would opt into dynamic
  // rendering just to read the current locale.
  setRequestLocale(locale);

  const [activities, stays, cmsNav, messages, t, tNav] = await Promise.all([
    getActivities(locale),
    getStays(locale),
    getNavigation(locale),
    getMessages(),
    getTranslations({ locale, namespace: "site" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);

  // An admin-managed nav (docs/cms.md) wins if anything has been authored
  // for this locale; otherwise this is exactly the hardcoded nav array,
  // translated, unchanged from before that CMS collection existed. Header
  // gets pre-resolved {label, href, menu} either way — it doesn't know or
  // care which source it came from.
  const navItems =
    cmsNav.length > 0
      ? cmsNav.map((item) => ({
          label: item.label,
          href: item.url,
          menu:
            item.menuType === "EXPERIENCES"
              ? ("experiences" as const)
              : item.menuType === "STAYS"
                ? ("stays" as const)
                : undefined,
        }))
      : staticNav.map((item) => ({ label: tNav(item.labelKey), href: item.href, menu: item.menu }));

  // LodgingBusiness sitewide (DI-026/SEO-07) — a camp selling overnight
  // stays qualifies for this type and it unlocks richer results than the
  // bare TouristAttraction this replaced, which only ever rendered on the
  // homepage. priceRange is computed from real prices, not guessed.
  // `sameAs` is deliberately omitted: site.social currently points at each
  // platform's generic homepage, not this business's actual profile, and
  // emitting that as sameAs would be wrong structured data, not just
  // incomplete — add it once the real profile URLs are known.
  const prices = [...activities.map((a) => a.priceFrom), ...stays.map((s) => s.priceFrom)];
  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: site.legalName,
    description: t("description"),
    url: site.url,
    telephone: site.phone,
    priceRange: `€${Math.min(...prices)}–€${Math.max(...prices)}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sabria",
      addressRegion: "Kebili",
      addressCountry: "TN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.coords.lat,
      longitude: site.coords.lng,
    },
    image: `${site.url}/images/under-hero.jpg`,
    inLanguage: locale,
  };

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${alexandria.variable} ${inter.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
            />
            <Header activities={activities} stays={stays} navItems={navItems} />
            <main>{children}</main>
            <Footer />
            <WhatsAppButton />
            <CookieConsent />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
