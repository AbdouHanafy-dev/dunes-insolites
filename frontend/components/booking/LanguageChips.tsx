"use client";

import { useLocale } from "next-intl";
import CountryFlag from "@/components/CountryFlag";
import type { Language } from "@/lib/api";
import { isoForLanguage, localizedLanguageName } from "@/lib/languageFlags";

/** Guide-language chips with flags - the same list on every circuit booking form. */
export default function LanguageChips({
  languages,
  selectedIds,
  onToggle,
}: {
  languages: Language[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const locale = useLocale();
  if (languages.length === 0) return null;
  return (
    <div className="language-list">
      {languages.map((language) => {
        const selected = selectedIds.includes(language.id);
        const iso = isoForLanguage(language.name);
        return (
          <button
            key={language.id}
            type="button"
            className="language-chip"
            aria-pressed={selected}
            onClick={() => onToggle(language.id)}
          >
            {iso ? <CountryFlag iso={iso} className="language-flag" /> : <span className="language-flag" aria-hidden="true">🌐</span>}
            <span className="language-name">{localizedLanguageName(locale, language.name)}</span>
            {selected && <span className="language-check" aria-hidden="true">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
