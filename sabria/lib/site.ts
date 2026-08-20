export const site = {
  name: "Dunes Insolites",
  brandLine: "Southern Tunisia",
  hero: "SABRIA",
  legalName: "Sabria Desert Adventures",
  tagline: "Where the Sahara feels endless.",
  description:
    "Camel treks, quad safaris, and sandboarding across the Sahara at sunset. Book your Sabria desert adventure.",
  url: "https://dunes-insolites.example",
  email: "hello@dunes-insolites.tn",
  /** Taken from the live site, dunes-insolites.com. */
  phone: "+216 27 391 501",
  whatsapp: "+216 27 391 501",
  address: "Sabria, Kebili Governorate, Tunisia",
  coords: { lat: 33.2286, lng: 9.0056 },
  social: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Facebook", href: "https://facebook.com" },
    { label: "TikTok", href: "https://tiktok.com" },
  ],
} as const;

/**
 * Top navigation. Mirrors the information architecture of the live site
 * (dunes-insolites.com) but with the vague "Nos Services" split into the two
 * things people actually shop for, and Contact promoted out of the footer.
 *
 * Everything Dunes Insolites runs happens on-site in Sabria — there's no
 * separate multi-day touring product (that's a different business). "Stay"
 * is the nuitée reservation (the fixed camp or a bivouac further out),
 * distinct from "The camp" (the team/philosophy page at /about).
 *
 * FR labels are noted for the i18n pass: The camp = Le campement,
 * Experiences = Nos expériences, Stay = Séjour, Gallery = Galerie,
 * Safety = Sécurité, Contact = Contact.
 */
export type NavItem = {
  label: string;
  href: string;
  /** Marks a section that gets a mega-menu dropdown — "experiences" builds
   *  it from the activity list, "stays" from the nuitée list. */
  menu?: "experiences" | "stays";
};

export const nav: NavItem[] = [
  { label: "The camp", href: "/about" },
  { label: "Experiences", href: "/activities", menu: "experiences" },
  { label: "Stay", href: "/camp", menu: "stays" },
  { label: "Gallery", href: "/gallery" },
  { label: "Safety", href: "/safety" },
  { label: "Contact", href: "/contact" },
];

/**
 * The languages the business wants. Only `available` ones render as
 * selectable — the rest show as pending so the control is honest until
 * next-intl is wired up.
 */
export const locales = [
  { code: "en", short: "EN", label: "English", available: true },
  { code: "fr", short: "FR", label: "Français", available: false },
  { code: "de", short: "DE", label: "Deutsch", available: false },
  { code: "it", short: "IT", label: "Italiano", available: false },
  { code: "da", short: "DA", label: "Dansk", available: false },
  { code: "ar", short: "AR", label: "العربية", available: false },
] as const;
