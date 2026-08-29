// Single source of truth for which guide articles exist - the index page,
// the [slug] detail route, and the sitemap all read from this instead of
// each keeping their own copy of the slug list. Deliberately a short,
// hardcoded array rather than a CMS-driven list: there are only two
// articles today, and both are FR/EN-only pending real translation into
// the other 4 locales (see ARCHITECTURE.md's translation Phase B) - a
// small array like this is easier to keep honest than a generic content
// query that would need its own locale-availability logic.
export const GUIDE_SLUGS = [
  {
    slug: "desert-sabria-tunisie",
    namespace: "guideSahara",
    metaNamespace: "meta.guideSahara",
  },
  {
    slug: "que-faut-il-emporter-desert",
    namespace: "guidePacking",
    metaNamespace: "meta.guidePacking",
  },
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number]["slug"];
