"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { logout } from "@/lib/api";

const TABS = [
  { href: "/account", key: "tabAccount" },
  { href: "/account/bookings", key: "tabBookings" },
  { href: "/account/payments", key: "tabPayments" },
  { href: "/account/reviews", key: "tabReviews" },
  { href: "/account/support", key: "tabSupport" },
] as const;

export default function AccountNav() {
  const t = useTranslations("account");
  const pathname = usePathname();
  const router = useRouter();

  async function onLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="account-tabs" aria-label={t("navLabel")}>
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} data-active={pathname === tab.href}>
          {t(tab.key)}
        </Link>
      ))}
      <button
        type="button"
        onClick={onLogout}
        style={{
          padding: "10px 20px",
          borderRadius: 999,
          border: "1px solid rgba(42,21,16,.18)",
          background: "transparent",
          font: "inherit",
          fontSize: ".8rem",
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--muted)",
          cursor: "pointer",
        }}
      >
        {t("logout")}
      </button>
    </nav>
  );
}
