/**
 * Brand config — name, URL, nav, contact details.
 *
 * Two separate legal entities will eventually share this platform (see the
 * root CLAUDE.md): Dunes Insolites (this vitrine) and Route Insolite, a
 * second brand landing in R4. `BrandConfig` + `resolveBrand()` exist now so
 * that R4 is a second entry in `BRANDS` plus content, not a fork of this
 * app (docs/ROADMAP.md, DI-016).
 *
 * Today there is exactly one brand and one deployment, so every existing
 * `site.xxx` call site keeps reading a static default (`DUNES_INSOLITES`)
 * unchanged — nothing needs to call `resolveBrand()` yet. When a second
 * brand actually needs to render from the same deploy, swap the `site`
 * export below for a per-request `resolveBrand(headers().get("host"))`
 * call; every consumer of `site`/`nav` is unaffected either way.
 */

export type NavItem = {
  /** Key into the "nav" namespace in messages/{locale}.json - labels are
   *  translated, not hardcoded, since this config is shared across all 6
   *  locales (multi-language rollout). */
  labelKey: string;
  href: string;
  /** Marks a section that gets a mega-menu dropdown — "experiences" builds
   *  it from the activity list, "stays" from the nuitée list. */
  menu?: "experiences" | "stays";
};

export type BrandConfig = {
  /** Matches the backend's CompanyType enum (packages/api-types doesn't
   *  carry this — it's presentation/routing, not a wire shape). */
  companyType: "DUNES_INSOLITES" | "ROUTE_INSOLITE";
  name: string;
  brandLine: string;
  hero: string;
  legalName: string;
  tagline: string;
  description: string;
  /**
   * The real canonical host, with `www` — that is what the live site's own
   * sitemap declares, so canonicals must match it exactly or they self-conflict.
   *
   * This feeds `metadataBase`, which in turn feeds every canonical, Open Graph
   * URL, sitemap entry, robots.txt Sitemap directive and JSON-LD image URL.
   */
  url: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  coords: { lat: number; lng: number };
  social: { label: string; href: string }[];
  /**
   * Top navigation. Mirrors the information architecture of the live site
   * (dunes-insolites.com) but with the vague "Nos Services" split into the
   * two things people actually shop for, and Contact promoted out of the
   * footer.
   *
   * Everything Dunes Insolites runs happens on-site in Sabria — there's no
   * separate multi-day touring product (that's Route Insolite's, a
   * different legal entity — see CLAUDE.md). "Stay" is the nuitée
   * reservation (the fixed camp or a bivouac further out), distinct from
   * "The camp" (the team/philosophy page at /about).
   *
   * FR labels are noted for the i18n pass: The camp = Le campement,
   * Experiences = Nos expériences, Stay = Séjour, Gallery = Galerie,
   * Safety = Sécurité, Contact = Contact.
   */
  nav: NavItem[];
};

const DUNES_INSOLITES: BrandConfig = {
  companyType: "DUNES_INSOLITES",
  name: "Dunes Insolites",
  brandLine: "Southern Tunisia",
  hero: "SABRIA",
  legalName: "Sabria Desert Adventures",
  tagline: "Where the Sahara feels endless.",
  description:
    "Camel treks, quad safaris, and sandboarding across the Sahara at sunset. Book your Sabria desert adventure.",
  url: "https://www.dunes-insolites.com",
  email: "hello@dunes-insolites.tn",
  /** Taken from the live site, dunes-insolites.com. */
  phone: "+216 27 391 501",
  whatsapp: "+216 27 391 501",
  address: "Sabria, Kebili Governorate, Tunisia",
  coords: { lat: 33.2286, lng: 9.0056 },
  social: [
    { label: "Instagram", href: "https://www.instagram.com/dunes_insolites/" },
    { label: "Facebook", href: "https://www.facebook.com/campementdunes" },
    { label: "TikTok", href: "https://www.tiktok.com/@dunes_insolites" },
  ],
  nav: [
    { labelKey: "theCamp", href: "/about" },
    { labelKey: "experiences", href: "/activities", menu: "experiences" },
    { labelKey: "stay", href: "/camp", menu: "stays" },
    { labelKey: "gallery", href: "/gallery" },
    { labelKey: "safety", href: "/safety" },
    { labelKey: "contact", href: "/contact" },
    // Route Insolite's circuits — published here since 18 Sep 2026 (business
    // owner, explicit; see docs/OPEN-QUESTIONS.md Q6's addendum). Appended
    // last rather than reordering the five items above, which already exist
    // as real rows (scripts/seed-navigation.py) in the CMS-managed
    // Navigation collection production actually reads — this static array
    // is only the fallback for an environment with no CMS nav at all.
    { labelKey: "circuits", href: "/circuits" },
  ],
};

/**
 * Keyed by the hostname each brand's vitrine is served from (see
 * ARCHITECTURE.md §1 for the two-company split). `www.dunes-insolites.com`
 * is the canonical entry; the bare domain is included too since either
 * could reach the app depending on DNS/redirect setup upstream of Next.
 */
const BRANDS: Record<string, BrandConfig> = {
  "www.dunes-insolites.com": DUNES_INSOLITES,
  "dunes-insolites.com": DUNES_INSOLITES,
};

const DEFAULT_BRAND = DUNES_INSOLITES;

/**
 * Resolves the brand for a given request host. Falls back to Dunes
 * Insolites for local dev, preview deployments, or any host not yet
 * mapped — this app serves only that one brand today, so an unrecognized
 * host is never a sign of misconfiguration worth failing loudly over.
 */
export function resolveBrand(hostname?: string | null): BrandConfig {
  if (!hostname) return DEFAULT_BRAND;
  const host = hostname.split(":")[0].toLowerCase();
  return BRANDS[host] ?? DEFAULT_BRAND;
}

export const site = DEFAULT_BRAND;
export const nav = site.nav;

/**
 * Where an ADMIN/CAMPING/PARTENAIRE account is sent after logging in on the
 * public vitrine — this app has no backoffice of its own yet (that's R3,
 * docs/ROADMAP.md); until then staff use the existing Angular `admin-app`.
 * The default matches backend/docker-compose.yml's nginx comment
 * (`admin.dunesinsolites.com`, no hyphen — differs from the public brand
 * domain `dunes-insolites.com`, unverified against a live DNS record).
 * Override with NEXT_PUBLIC_ADMIN_APP_URL once the real URL is confirmed.
 */
export const adminAppUrl =
  process.env.NEXT_PUBLIC_ADMIN_APP_URL ?? "https://admin.dunesinsolites.com";

/**
 * Display metadata for every locale next-intl serves (i18n/routing.ts is
 * the actual routing source of truth - this is presentation only: label,
 * flag). All 6 are live. Not brand-specific — the platform serves one
 * language set regardless of which company's vitrine is active.
 */
export const locales = [
  { code: "fr", short: "FR", label: "Français" },
  { code: "en", short: "EN", label: "English" },
  { code: "de", short: "DE", label: "Deutsch" },
  { code: "it", short: "IT", label: "Italiano" },
  { code: "da", short: "DA", label: "Dansk" },
  { code: "ar", short: "AR", label: "العربية" },
] as const;
