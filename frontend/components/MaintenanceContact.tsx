"use client";

import { site } from "@/lib/site";
import { trackWhatsAppClick } from "@/lib/analytics";

/**
 * Self-contained like MaintenanceCountdown/MaintenanceNotifyForm — no
 * next-intl context on this page. On request: people who want to book
 * while the site is gated behind the launch countdown shouldn't be stuck
 * with only an email form, so this provides a WhatsApp deep link using
 * site.whatsapp and wa.me, plus a row of social icons.
 *
 * Only icons for platforms actually configured in lib/site.ts's
 * `site.social` are rendered (currently Instagram, Facebook, TikTok — no
 * X/Twitter, since no real profile URL exists for it there). Adding a
 * fourth icon without a real link would be inventing a presence that
 * doesn't exist, which the project's no-fabrication rule also covers.
 */

const ICONS: Record<string, React.ReactNode> = {
  Instagram: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Facebook: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.6h2.55l.4-2.96h-2.95V8.6c0-.86.24-1.44 1.47-1.44h1.56V4.53c-.27-.04-1.2-.12-2.28-.12-2.26 0-3.8 1.38-3.8 3.9v2.13H8.1v2.96h2.35V21h3.05z" />
    </svg>
  ),
  TikTok: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.35 1.9 1.6 3.32 3.5 3.6v2.7c-1.28.03-2.5-.36-3.5-1.05v6.3c0 3.03-2.46 5.45-5.5 5.45S5.5 17.58 5.5 14.55c0-2.85 2.1-5.2 4.85-5.42v2.75a2.72 2.72 0 0 0-1.85 2.67 2.75 2.75 0 0 0 2.75 2.75 2.75 2.75 0 0 0 2.75-2.75V3h2.5z" />
    </svg>
  ),
};

export default function MaintenanceContact({
  labels,
}: {
  labels: {
    heading: string;
    body: string;
    whatsappButton: string;
    followLabel: string;
  };
}) {
  const number = site.whatsapp.replace(/[^\d]/g, "");
  const text = encodeURIComponent("Bonjour Dunes Insolites, je souhaite réserver.");

  return (
    <div className="maint-contact">
      <p className="idx-label maint-eyebrow">{labels.heading}</p>
      <p className="maint-contact-body">{labels.body}</p>
      <a
        className="maint-whatsapp"
        href={`https://wa.me/${number}?text=${text}`}
        target="_blank"
        rel="noreferrer noopener"
        onClick={() => trackWhatsAppClick("maintenance_page")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.69 8.23-8.24 8.23z" />
        </svg>
        {labels.whatsappButton}
      </a>

      <p className="maint-follow-label">{labels.followLabel}</p>
      <div className="maint-social">
        {site.social
          .filter((s) => ICONS[s.label])
          .map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={s.label}
              className="maint-social-icon"
            >
              {ICONS[s.label]}
            </a>
          ))}
      </div>
    </div>
  );
}
