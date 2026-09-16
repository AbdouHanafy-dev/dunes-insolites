import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { alexandria, inter } from "../fonts";
import { getActivities, getStays, getNavigation, getSiteSettings } from "@/lib/api";
import { site, nav as staticNav } from "@/lib/site";
import { routing, isRtl } from "@/i18n/routing";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import Analytics from "@/components/Analytics";
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

  const [activities, stays, cmsNav, messages, t, tNav, settings] = await Promise.all([
    getActivities(locale),
    getStays(locale),
    getNavigation(locale),
    getMessages(),
    getTranslations({ locale, namespace: "site" }),
    getTranslations({ locale, namespace: "nav" }),
    getSiteSettings(),
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
  // `sameAs`: site.social now holds the real Instagram/Facebook/TikTok
  // profile URLs (added 15 Sep 2026) rather than each platform's generic
  // homepage — safe to emit as structured data now.
  const prices = [...activities.map((a) => a.priceFrom), ...stays.map((s) => s.priceFrom)];
  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: site.legalName,
    description: t("description"),
    url: site.url,
    telephone: settings.phone,
    priceRange: `€${Math.min(...prices)}–€${Math.max(...prices)}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sabria",
      addressRegion: "Kebili",
      addressCountry: "TN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: settings.coords.lat,
      longitude: settings.coords.lng,
    },
    image: `${site.url}/images/under-hero.jpg`,
    sameAs: settings.social.map((s) => s.href),
    inLanguage: locale,
  };

  // Organization + WebSite (SEO audit, step 7) — sitewide, locale-independent
  // identity separate from LodgingBusiness above (that one describes the
  // camp as a place to stay; this describes Dunes Insolites as a
  // publisher/organization, which is what Google's sitelinks searchbox and
  // knowledge-panel logic key off). `sameAs` now uses the real profile
  // URLs in site.social (added 15 Sep 2026). No SearchAction: the site
  // has no internal search to describe one truthfully.
  // `logo`: the real brand mark, public/logo-mark.png (also used by
  // Header/Footer) — Organization's logo must be an actual mark, not a
  // photo, which is why this stayed unset while only photography existed.
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    email: settings.email,
    telephone: settings.phone,
    logo: `${site.url}/logo-mark.png`,
    sameAs: settings.social.map((s) => s.href),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sabria",
      addressRegion: "Kebili",
      addressCountry: "TN",
    },
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
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
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
            />
            <Header activities={activities} stays={stays} navItems={navItems} settings={settings} />
            <main>{children}</main>
            <Footer settings={settings} />
            <WhatsAppButton whatsapp={settings.whatsapp} />
            <CookieConsent />
            <Analytics />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
