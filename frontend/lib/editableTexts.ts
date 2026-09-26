/**
 * The wording of the booking forms the owner can change from the back office. The messages files
 * stay the source of the default text; an override only replaces a text that already exists there
 * and only inside these sections, so a typo in the back office can never add or break a page.
 */
export const EDITABLE_NAMESPACES = ["tourBookingForm", "stayReservationForm", "bookingFlow", "currencySwitcher"] as const;

type Messages = { [key: string]: unknown };
export type TextOverrides = Record<string, Record<string, string>>;

const isPlainObject = (v: unknown): v is Messages => typeof v === "object" && v !== null && !Array.isArray(v);

/** Every text of the editable sections as "namespace.key" -> text. */
export function editableDefaults(messages: Messages): Record<string, string> {
  const out: Record<string, string> = {};
  for (const ns of EDITABLE_NAMESPACES) {
    const section = messages[ns];
    if (!isPlainObject(section)) continue;
    for (const [key, value] of Object.entries(section)) {
      if (typeof value === "string") out[`${ns}.${key}`] = value;
    }
  }
  return out;
}

/** The {placeholders} a message uses, e.g. "{price}" -> ["price"]. Plural/select arguments count by name. */
export function placeholdersOf(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)/g)) names.add(m[1]);
  return [...names].sort();
}

function bracesBalanced(text: string): boolean {
  let depth = 0;
  for (const ch of text) {
    if (ch === "{") depth++;
    else if (ch === "}" && --depth < 0) return false;
  }
  return depth === 0;
}

/**
 * Whether an edited text is safe to show: balanced braces and no placeholder the site does not
 * provide (a made-up {name} would fail to render the whole page). Removing a placeholder is fine.
 */
export function isUsableOverride(defaultText: string, edited: string): boolean {
  if (!edited.trim() || !bracesBalanced(edited)) return false;
  const allowed = new Set(placeholdersOf(defaultText));
  return placeholdersOf(edited).every((name) => allowed.has(name));
}

/** The messages with the owner's wording laid over the defaults; anything not usable is ignored. */
export function applyTextOverrides(messages: Messages, overrides: Record<string, string> | undefined): Messages {
  if (!overrides) return messages;
  const out: Messages = { ...messages };
  for (const [path, text] of Object.entries(overrides)) {
    const [ns, key] = path.split(".");
    if (!ns || !key || path.split(".").length !== 2) continue;
    if (!(EDITABLE_NAMESPACES as readonly string[]).includes(ns)) continue;
    const section = out[ns];
    if (!isPlainObject(section)) continue;
    const current = section[key];
    if (typeof current !== "string" || !isUsableOverride(current, text)) continue;
    out[ns] = { ...section, [key]: text };
  }
  return out;
}
