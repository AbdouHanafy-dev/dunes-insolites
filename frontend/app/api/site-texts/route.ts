import { routing } from "@/i18n/routing";
import { EDITABLE_NAMESPACES, editableDefaults } from "@/lib/editableTexts";

/**
 * What the back office can edit: every text of the booking forms with its shipped wording in each
 * language. The messages files stay the single source of the defaults; the back office only reads
 * this list and stores its own wording next to the API.
 */
export async function GET() {
  const defaults: Record<string, Record<string, string>> = {};
  for (const locale of routing.locales) {
    const messages = (await import(`../../../messages/${locale}.json`)).default as Record<string, unknown>;
    defaults[locale] = editableDefaults(messages);
  }
  return Response.json(
    { locales: routing.locales, namespaces: EDITABLE_NAMESPACES, defaults },
    { headers: { "Cache-Control": "no-store" } },
  );
}
