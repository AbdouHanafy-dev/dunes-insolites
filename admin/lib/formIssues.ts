import { CONSTRAINT_TEXT, columnToKey, formatPath, parseConstraintMessage } from "./tourIssues";

/**
 * Exact per-field problems for the generic admin forms (CollectionEditor and
 * anything built on FieldDef). One list serves both inline messages under each
 * input and the summary panel, so nothing the operator got wrong is left for a
 * one-field-at-a-time browser bubble.
 */
export type FieldLike = { key: string; label: string; type: string; required?: boolean };

export type FormIssue = {
  /** Key of the form field this belongs to; "" when it belongs to no plain field. */
  key: string;
  /** Raw path as the backend reported it (or the field key for local checks). */
  path: string;
  label: string;
  message: string;
};

const STRUCTURAL_LABEL: Record<string, string> = {
  translations: "Traductions",
  photos: "Photos",
  coverPhotoUrl: "Photo de couverture",
  tiers: "Types d'hébergement",
};

const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

export function validateRequired(fields: FieldLike[], form: Record<string, unknown>): FormIssue[] {
  const out: FormIssue[] = [];
  for (const f of fields) {
    if (f.type === "repeater" || f.type === "checkbox") continue;
    const v = form[f.key];
    if (f.type === "number" && typeof v === "number" && Number.isNaN(v)) {
      out.push({ key: f.key, path: f.key, label: f.label, message: "saisissez un nombre (le champ est vide ou invalide)." });
    } else if (f.required && (isBlank(v) || (f.type === "number" && v === ""))) {
      out.push({ key: f.key, path: f.key, label: f.label, message: "champ obligatoire — il est vide." });
    }
  }
  return out;
}

export function issuesFromServer(
  fields: FieldLike[],
  errors: Record<string, string>,
  fallbackMessage: string,
): FormIssue[] {
  const entries = Object.entries(errors);
  if (entries.length === 0) {
    const constraint = parseConstraintMessage(fallbackMessage);
    if (constraint) {
      return constraint.columns.map((column) => {
        const key = columnToKey(column);
        const field = fields.find((f) => f.key === key);
        return { key: field ? field.key : "", path: column, label: field?.label ?? column, message: CONSTRAINT_TEXT[constraint.kind] };
      });
    }
    return [{ key: "", path: "", label: "Serveur", message: fallbackMessage }];
  }
  return entries.map(([path, reason]) => {
    const base = /^[A-Za-z0-9_]+/.exec(path)?.[0] ?? path;
    const field = fields.find((f) => f.key === base);
    const { label } = formatPath(path, field?.label ?? STRUCTURAL_LABEL[base] ?? base);
    return { key: field ? field.key : "", path, label, message: reason };
  });
}

export function summarizeFormIssues(issues: FormIssue[], max = 4): string {
  const shown = issues.slice(0, max).map((i) => `${i.label} : ${i.message}`);
  const rest = issues.length - shown.length;
  return shown.join(" · ") + (rest > 0 ? ` · … et ${rest} autre(s)` : "");
}
