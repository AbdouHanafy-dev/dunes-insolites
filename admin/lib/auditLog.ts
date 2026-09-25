/** One row of the backoffice activity log, as the backend returns it. */
export type AuditLogEntry = {
  id: string;
  occurredAt: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  actorRoles: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "ACTION" | string;
  verb: string | null;
  method: string;
  path: string;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  statusCode: number;
  ip: string | null;
  userAgent: string | null;
};

export type AuditLogPage = { items: AuditLogEntry[]; page: number; size: number; total: number };

export const ACTION_OPTIONS = [
  { value: "", label: "Toutes les actions" },
  { value: "CREATE", label: "Créations" },
  { value: "UPDATE", label: "Modifications" },
  { value: "DELETE", label: "Suppressions" },
  { value: "ACTION", label: "Actions (statut, validation…)" },
] as const;

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  ACTION: "Action",
};

export function actionLabel(action: string, verb: string | null): string {
  const base = ACTION_LABELS[action] ?? action;
  return action === "ACTION" && verb ? `${base} · ${verb}` : base;
}

/** The record types the log knows, in the words the team uses. */
const ENTITY_LABELS: Record<string, string> = {
  tours: "Circuit",
  "tour-types": "Type de circuit",
  extras: "Activité",
  "accommodation-types": "Type d’hébergement",
  pages: "Page",
  redirects: "Redirection",
  "maintenance-windows": "Maintenance",
  "content-blocks": "Bloc de contenu",
  navigation: "Navigation",
  "guide-profiles": "Guide",
  "driver-profiles": "Chauffeur",
  chauffeurs: "Chauffeur",
  guides: "Guide",
  users: "Utilisateur",
  invoices: "Facture",
  sources: "Source de réservation",
  "external-reviews": "Avis externe",
  reservations: "Réservation",
  transactions: "Paiement",
  media: "Média",
  gallery: "Galerie",
  languages: "Langue",
  "site-images": "Photo du site",
  "site-settings": "Paramètres du site",
  "camping-settings": "Paramètres du camp",
  availability: "Disponibilité",
  reviews: "Avis",
  "review-platforms": "Plateforme d’avis",
  "newsletter-subscribers": "Abonné newsletter",
  "payment-policy": "Politique de paiement",
  "admin/role-permissions": "Permissions",
  "admin/custom-roles": "Rôle personnalisé",
};

export function entityTypeLabel(type: string | null): string {
  if (!type) return "—";
  return ENTITY_LABELS[type] ?? type;
}

/** "Android · Chrome", "Windows · Edge" — enough to tell a phone from a laptop. */
export function summarizeDevice(userAgent: string | null): string {
  if (!userAgent) return "—";
  const ua = userAgent;
  const os = /Android/i.test(ua) ? "Android"
    : /iPhone|iPad|iOS/i.test(ua) ? "iOS"
    : /Windows/i.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/i.test(ua) ? "macOS"
    : /Linux/i.test(ua) ? "Linux"
    : null;
  const browser = /Edg\//i.test(ua) ? "Edge"
    : /OPR\/|Opera/i.test(ua) ? "Opera"
    : /Firefox\//i.test(ua) ? "Firefox"
    : /Chrome\//i.test(ua) ? "Chrome"
    : /Safari\//i.test(ua) ? "Safari"
    : null;
  return [os, browser].filter(Boolean).join(" · ") || "Inconnu";
}

/** Who did it: the name when known, the e-mail under it, never an empty cell. */
export function actorDisplay(e: Pick<AuditLogEntry, "actorName" | "actorEmail" | "actorId">): { primary: string; secondary: string | null } {
  const primary = e.actorName?.trim() || e.actorEmail?.trim() || e.actorId || "Inconnu";
  const secondary = e.actorEmail && e.actorEmail !== primary ? e.actorEmail : null;
  return { primary, secondary };
}

/** A write the server refused or that failed. */
export function isFailure(statusCode: number): boolean {
  return statusCode >= 400;
}
