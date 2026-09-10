"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { logout } from "@/lib/api";

const ICONS: Record<string, React.ReactNode> = {
  tabAccount: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c1.6-4 5-6 8-6s6.4 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  tabBookings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  tabPayments: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="6" width="17" height="12.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 10.5h17" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  tabReviews: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.5l2.5 5.3 5.7.7-4.2 4 1.1 5.8-5.1-2.9-5.1 2.9 1.1-5.8-4.2-4 5.7-.7L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  tabSupport: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12a8 8 0 1 1 3.2 6.4L4 19.5l1.1-3.3A7.96 7.96 0 0 1 4 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const TABS = [
  { href: "/account", key: "tabBookings", contextKey: "upcomingCount" },
  { href: "/account/payments", key: "tabPayments", contextKey: "actionRequiredCount" },
  { href: "/account/reviews", key: "tabReviews", contextKey: null },
  { href: "/account/support", key: "tabSupport", contextKey: null },
  { href: "/account/profile", key: "tabAccount", contextKey: null },
] as const;

/**
 * `upcomingCount`/`actionRequiredCount` are real, computed server-side in
 * layout.tsx from the same reservation data the overview and payments
 * pages already fetch - never a placeholder badge. Zero renders as no
 * badge at all (per the redesign brief: "do not show badges if there is
 * no meaningful data"), not a "0" pill.
 */
export default function AccountNav({
  name,
  upcomingCount,
  actionRequiredCount,
}: {
  name: string;
  upcomingCount: number;
  actionRequiredCount: number;
}) {
  const t = useTranslations("account");
  const pathname = usePathname();
  const router = useRouter();

  async function onLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const context: Record<string, string | null> = {
    upcomingCount: upcomingCount > 0 ? t("sidebarUpcoming", { count: upcomingCount }) : null,
    actionRequiredCount:
      actionRequiredCount > 0 ? t("sidebarActionRequired", { count: actionRequiredCount }) : null,
  };

  return (
    <nav className="account-sidebar" aria-label={t("navLabel")}>
      <div className="account-sidebar-identity">
        <span className="account-sidebar-avatar" aria-hidden="true">
          {initial}
        </span>
        <div>
          <div className="account-sidebar-name">{name}</div>
          <button type="button" onClick={onLogout} className="account-sidebar-logout">
            {t("logout")}
          </button>
        </div>
      </div>
      <div className="account-sidebar-links">
        {TABS.map((tab) => {
          const contextText = tab.contextKey ? context[tab.contextKey] : null;
          return (
            <Link key={tab.href} href={tab.href} data-active={pathname === tab.href}>
              <span className="account-sidebar-icon" aria-hidden="true">
                {ICONS[tab.key]}
              </span>
              <span className="account-sidebar-label-group">
                <span className="account-sidebar-label">{t(tab.key)}</span>
                {contextText && <span className="account-sidebar-context">{contextText}</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
