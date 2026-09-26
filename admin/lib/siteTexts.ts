/** What the site says it lets the team edit: every booking-form text with its shipped wording per language. */
export type SiteTextCatalogue = {
  locales: string[];
  namespaces: string[];
  /** language -> ("section.key" -> shipped text) */
  defaults: Record<string, Record<string, string>>;
};

/** language -> ("section.key" -> the team's wording); only what was changed. */
export type SiteTextOverrides = Record<string, Record<string, string>>;

export const NAMESPACE_LABELS: Record<string, string> = {
  tourBookingForm: "Formulaire circuit",
  stayReservationForm: "Formulaire hébergement",
  bookingFlow: "Réservation (choix du type et du circuit)",
  currencySwitcher: "Menu des devises",
};

export const LOCALE_LABELS: Record<string, string> = {
  fr: "Français", en: "English", de: "Deutsch", it: "Italiano", da: "Dansk", ar: "العربية",
};

export type SiteTextRow = { path: string; namespace: string; key: string; fallback: string };

/** The texts to list, in the order of the sections, filtered by section and by what the team typed. */
export function textRows(catalogue: SiteTextCatalogue, namespace: string, query: string): SiteTextRow[] {
  const fr = catalogue.defaults.fr ?? {};
  const needle = query.trim().toLowerCase();
  return catalogue.namespaces
    .filter((ns) => !namespace || ns === namespace)
    .flatMap((ns) =>
      Object.entries(fr)
        .filter(([path]) => path.startsWith(ns + "."))
        .map(([path, fallback]) => ({ path, namespace: ns, key: path.slice(ns.length + 1), fallback })),
    )
    .filter((row) => !needle || row.key.toLowerCase().includes(needle) || row.fallback.toLowerCase().includes(needle));
}

/** How many languages of a text the team has changed. */
export function overriddenCount(overrides: SiteTextOverrides, path: string): number {
  return Object.values(overrides).filter((texts) => texts[path] !== undefined).length;
}
