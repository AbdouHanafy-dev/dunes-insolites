import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { getSiteTextOverrides } from "@/lib/api";
import { applyTextOverrides } from "@/lib/editableTexts";

type Messages = { [key: string]: unknown };

const isPlainObject = (v: unknown): v is Messages =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Deep-merge: any key a locale hasn't translated yet falls back to the default language. */
function withFallback(base: Messages, overrides: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const current = out[key];
    out[key] = isPlainObject(current) && isPlainObject(value) ? withFallback(current, value) : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const messages = (await import(`../messages/${locale}.json`)).default as Messages;
  // The owner's wording for the booking forms (back office), laid over the shipped texts.
  const overrides = (await getSiteTextOverrides())[locale];
  if (locale === routing.defaultLocale) return { locale, messages: applyTextOverrides(messages, overrides) };

  const base = (await import(`../messages/${routing.defaultLocale}.json`)).default as Messages;
  return { locale, messages: applyTextOverrides(withFallback(base, messages), overrides) };
});
