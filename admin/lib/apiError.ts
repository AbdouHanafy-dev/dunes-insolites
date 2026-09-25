/**
 * Turns a failed backoffice request into a message that says exactly what is
 * wrong: the server's own reason, then every rejected field with its own
 * message, then the HTTP status. The backend answers validation failures with
 * `{ message: "Validation failed…", errors: { field: "reason" } }` — the
 * per-field map is the part that tells the operator what to fix, so it must
 * never be dropped in favour of a fixed sentence.
 */
export type ApiFailure = {
  status: number;
  message: string;
  /** field path -> reason, exactly as the backend reported them */
  fields: Record<string, string>;
};

const STATUS_HINT: Record<number, string> = {
  401: "Session expirée — reconnectez-vous.",
  403: "Votre rôle ne permet pas cette action.",
  404: "Élément introuvable (supprimé entre-temps ?).",
  409: "Conflit avec l'état actuel des données.",
  413: "Fichier ou contenu trop volumineux.",
  429: "Trop de requêtes — patientez quelques secondes.",
  502: "Le backend est injoignable.",
  503: "Le backend est indisponible.",
};

export async function parseApiFailure(res: Response): Promise<ApiFailure> {
  const raw = await res.text().catch(() => "");
  let body: { message?: unknown; error?: unknown; errors?: unknown } = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  const fields: Record<string, string> = {};
  if (body.errors && typeof body.errors === "object" && !Array.isArray(body.errors)) {
    for (const [field, reason] of Object.entries(body.errors as Record<string, unknown>)) {
      fields[field] = typeof reason === "string" ? reason : JSON.stringify(reason);
    }
  }

  const serverMessage =
    (typeof body.message === "string" && body.message.trim()) ||
    (typeof body.error === "string" && body.error.trim()) ||
    "";
  // A non-JSON body (HTML error page from a proxy, plain text) still says
  // something useful; keep the first line rather than dropping it.
  const rawHint = !serverMessage && raw && !raw.trimStart().startsWith("<") ? raw.trim().split("\n")[0].slice(0, 200) : "";

  return {
    status: res.status,
    message: serverMessage || rawHint || STATUS_HINT[res.status] || `Erreur ${res.status}`,
    fields,
  };
}

export function formatApiFailure(failure: ApiFailure, fallback?: string): string {
  const parts: string[] = [];
  if (fallback) parts.push(fallback);
  const hint = STATUS_HINT[failure.status];
  // "Forbidden"/"Unauthorized" tell the operator nothing — always say what the
  // status means (role limit, expired session) before the server's own wording.
  if (hint && [401, 403, 404, 429, 502, 503].includes(failure.status)) parts.push(hint);
  if (failure.message && failure.message !== fallback && failure.message !== hint) parts.push(failure.message);
  else if (hint && !parts.includes(hint)) parts.push(hint);
  const fieldList = Object.entries(failure.fields).map(([field, reason]) => `${field} : ${reason}`);
  if (fieldList.length > 0) parts.push(fieldList.join(" · "));
  parts.push(`(HTTP ${failure.status})`);
  return parts.join(" — ");
}

/** Read a failed response and return the exact, ready-to-display message. */
export async function readApiError(res: Response, fallback?: string): Promise<string> {
  return formatApiFailure(await parseApiFailure(res), fallback);
}

/** A fetch that threw (backend or network unreachable) — no response to read. */
export function describeNetworkError(cause: unknown): string {
  const detail = cause instanceof Error && cause.message ? ` (${cause.message})` : "";
  return `Connexion impossible : la requête n'a pas atteint le serveur${detail}.`;
}
