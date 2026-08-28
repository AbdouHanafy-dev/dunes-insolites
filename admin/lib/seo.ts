/**
 * The SEO quality checks — shared by the per-page editor (SeoEditor.tsx)
 * and the "Pages SEO" overview (app/(app)/seo/pages). One source of truth,
 * so the overview's issue counts can never drift from what an editor sees
 * on the page itself.
 *
 * Actionable checks, not a fake score — matches the brief's
 * "recommendations, not promises."
 */
export type SeoCheckLevel = "ok" | "warn" | "error";
export type SeoCheck = { label: string; level: SeoCheckLevel };

export type SeoFields = {
  seoTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  ogImageUrl: string | null;
};

export function seoChecks(form: SeoFields, fallbackTitle: string): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const title = form.seoTitle || fallbackTitle;

  checks.push(
    title ? { label: "Le titre SEO existe", level: "ok" } : { label: "Titre SEO manquant", level: "error" },
  );
  if (title && (title.length < 30 || title.length > 60)) {
    checks.push({ label: `Le titre fait ${title.length} caractères (idéal : 30–60)`, level: "warn" });
  }

  if (!form.metaDescription) {
    checks.push({ label: "Méta-description manquante", level: "error" });
  } else if (form.metaDescription.length < 70 || form.metaDescription.length > 160) {
    checks.push({
      label: `La méta-description fait ${form.metaDescription.length} caractères (idéal : 70–160)`,
      level: "warn",
    });
  } else {
    checks.push({ label: "La méta-description a une bonne longueur", level: "ok" });
  }

  if (form.focusKeyword && title && !title.toLowerCase().includes(form.focusKeyword.toLowerCase())) {
    checks.push({ label: "Le mot-clé principal n'apparaît pas dans le titre", level: "warn" });
  }

  checks.push(
    form.ogImageUrl
      ? { label: "Image Open Graph définie", level: "ok" }
      : { label: "Image Open Graph manquante", level: "warn" },
  );

  return checks;
}
