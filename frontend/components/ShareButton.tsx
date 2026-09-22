"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** Native share sheet where available, clipboard-copy fallback elsewhere. */
export default function ShareButton({ title }: { title: string }) {
  const t = useTranslations("tourCard");
  const [copied, setCopied] = useState(false);

  async function share(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled the share sheet - not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked - nothing more we can do here.
    }
  }

  return (
    <button type="button" className="wishlist-btn-inline" onClick={share} aria-label={t("share")}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 6l-4-4-4 4M12 2v14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{copied ? t("linkCopied") : t("share")}</span>
    </button>
  );
}
