// Best-effort ISO country code (for the flag) and BCP-47 language code (for
// auto-translating the display name via Intl.DisplayNames) for a spoken
// language name from the admin-managed SpokenLanguage catalog. Names are
// free text (French by default, no code stored), so this matches on common
// French/English/native keywords — unmatched languages return null rather
// than guessing wrong.
const LANGUAGE_BY_KEYWORD: { keywords: string[]; country: string; lang: string }[] = [
  { keywords: ["francais", "french"], country: "FR", lang: "fr" },
  { keywords: ["anglais", "english"], country: "GB", lang: "en" },
  { keywords: ["arabe", "arabic"], country: "SA", lang: "ar" },
  { keywords: ["allemand", "german", "deutsch"], country: "DE", lang: "de" },
  { keywords: ["italien", "italian", "italiano"], country: "IT", lang: "it" },
  { keywords: ["espagnol", "spanish", "espanol"], country: "ES", lang: "es" },
  { keywords: ["portugais", "portuguese"], country: "PT", lang: "pt" },
  { keywords: ["neerlandais", "dutch", "nederlands"], country: "NL", lang: "nl" },
  { keywords: ["russe", "russian"], country: "RU", lang: "ru" },
  { keywords: ["chinois", "chinese", "mandarin"], country: "CN", lang: "zh" },
  { keywords: ["japonais", "japanese"], country: "JP", lang: "ja" },
  { keywords: ["coreen", "korean"], country: "KR", lang: "ko" },
  { keywords: ["danois", "danish"], country: "DK", lang: "da" },
  { keywords: ["suedois", "swedish"], country: "SE", lang: "sv" },
  { keywords: ["norvegien", "norwegian"], country: "NO", lang: "no" },
  { keywords: ["finlandais", "finnish"], country: "FI", lang: "fi" },
  { keywords: ["turc", "turkish"], country: "TR", lang: "tr" },
  { keywords: ["polonais", "polish"], country: "PL", lang: "pl" },
  { keywords: ["grec", "greek"], country: "GR", lang: "el" },
  { keywords: ["hebreu", "hebrew"], country: "IL", lang: "he" },
  { keywords: ["roumain", "romanian"], country: "RO", lang: "ro" },
  { keywords: ["tcheque", "czech"], country: "CZ", lang: "cs" },
  { keywords: ["hindi"], country: "IN", lang: "hi" },
];

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function match(name: string) {
  const normalized = normalize(name);
  return LANGUAGE_BY_KEYWORD.find((entry) => entry.keywords.some((k) => normalized.includes(k)));
}

export function isoForLanguage(name: string): string | null {
  return match(name)?.country ?? null;
}

/**
 * The catalog's language name, auto-translated into `locale` via the
 * browser's own Intl.DisplayNames (no translation API, no per-language copy
 * to maintain) when it recognizes the name — e.g. "Arabe" -> "Arabic" for an
 * "en" locale. Falls back to the raw catalog string when unrecognized or
 * when Intl.DisplayNames can't resolve it (older engines, unsupported
 * locale), so the label is never blank.
 */
export function localizedLanguageName(locale: string, name: string): string {
  const langCode = match(name)?.lang;
  if (!langCode) return name;
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(langCode) ?? name;
  } catch {
    return name;
  }
}
