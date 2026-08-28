"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavLink = { label: string; href: string; icon: string; soon?: boolean };
type NavGroup = { label: string; items: NavLink[] };

// Full target IA (this session's brief, Section 12). Only Dashboard and
// Reservations are wired to real pages right now — everything else renders
// as a disabled, labeled placeholder rather than a dead link or invented
// content, so the nav shows where this is headed without pretending it's
// built. Each phase in the migration plan turns one more group live.
const GROUPS: NavGroup[] = [
  {
    label: "Opérations",
    items: [
      { label: "Nouvelle réservation", href: "#", icon: "✦", soon: true },
      { label: "Réservations", href: "/reservations", icon: "📅" },
      { label: "Clients", href: "/clients", icon: "👥" },
      { label: "Paiements", href: "/operations/paiements", icon: "💳" },
      { label: "Factures", href: "/operations/factures", icon: "📄" },
      { label: "Proformas", href: "/operations/proformas", icon: "📋" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { label: "Hébergements", href: "/catalogue/hebergements", icon: "🏕️" },
      { label: "Tours / Circuits", href: "/catalogue/tours", icon: "🗺️" },
      { label: "Extras", href: "/catalogue/extras", icon: "➕" },
      { label: "Disponibilités", href: "#", icon: "🗓️", soon: true },
    ],
  },
  {
    label: "Contenu",
    items: [
      { label: "Pages", href: "/content/pages", icon: "📑" },
      { label: "Blocs de contenu", href: "/content/blocks", icon: "🧩" },
      { label: "Navigation", href: "/content/navigation", icon: "🔗" },
      { label: "Médiathèque", href: "/content/media", icon: "🖼️" },
      { label: "Avis clients", href: "/content/avis", icon: "⭐" },
    ],
  },
  {
    label: "SEO",
    items: [
      { label: "Pages SEO", href: "/seo/pages", icon: "🔍" },
      { label: "Redirections", href: "/seo/redirections", icon: "↪️" },
      { label: "Sitemap", href: "#", icon: "🗺️", soon: true },
      { label: "Audit SEO", href: "#", icon: "✅", soon: true },
    ],
  },
  {
    label: "Analytique",
    items: [
      { label: "Statistiques", href: "#", icon: "📊", soon: true },
      { label: "Revenus", href: "#", icon: "💰", soon: true },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Utilisateurs", href: "/administration/utilisateurs", icon: "🧑‍💼" },
      { label: "Rôles & permissions", href: "/administration/roles", icon: "🔐" },
      { label: "Paramètres", href: "/administration/parametres", icon: "⚙️" },
    ],
  },
];

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-[999] bg-black/50 lg:hidden" onClick={onCloseMobile} />
      )}

      <nav
        className={`fixed inset-y-0 left-0 z-[1000] flex flex-col border-r border-navy-700/10 bg-surface-alt shadow-[1px_0_3px_rgba(22,35,58,0.04),4px_0_24px_rgba(22,35,58,0.06)] transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex min-h-20 items-center justify-between gap-3 border-b border-navy-700/8 px-5 py-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-navy-700/15 bg-white text-base shadow-sm">
              🏜️
            </span>
            {!collapsed && (
              <span className="truncate text-[15px] font-bold text-navy-800">Dunes Insolites</span>
            )}
          </div>
          <button
            className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-navy-700/12 bg-white text-navy-600/70 transition hover:border-gold/50 hover:text-navy-800 lg:flex"
            onClick={onToggleCollapsed}
            title={collapsed ? "Développer" : "Réduire"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Link
            href="/"
            title="Tableau de bord"
            className={`mb-4 flex items-center gap-3 rounded-lg border-l-4 px-3 py-3.5 text-[15px] font-medium transition ${
              pathname === "/"
                ? "border-gold bg-gold/12 text-navy-800"
                : "border-transparent text-navy-700/65 hover:bg-white hover:text-navy-800"
            }`}
          >
            <span className="w-6 flex-shrink-0 text-center text-lg">🏠</span>
            {!collapsed && <span className="truncate">Tableau de bord</span>}
          </Link>

          {GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-navy-700/35">
                  {group.label}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = !item.soon && pathname === item.href;
                  return (
                    <li key={item.label}>
                      {item.soon ? (
                        <span
                          title={`${item.label} — bientôt disponible`}
                          className="flex cursor-not-allowed items-center gap-3 rounded-lg border-l-4 border-transparent px-3 py-2.5 text-[14px] font-medium text-navy-700/28"
                        >
                          <span className="w-6 flex-shrink-0 text-center text-base">{item.icon}</span>
                          {!collapsed && (
                            <>
                              <span className="truncate">{item.label}</span>
                              <span className="ml-auto rounded-full bg-navy-700/6 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy-700/35">
                                Bientôt
                              </span>
                            </>
                          )}
                        </span>
                      ) : (
                        <Link
                          href={item.href}
                          title={item.label}
                          className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-[14px] font-medium transition ${
                            active
                              ? "border-gold bg-gold/12 text-navy-800"
                              : "border-transparent text-navy-700/65 hover:bg-white hover:text-navy-800"
                          }`}
                        >
                          <span className="w-6 flex-shrink-0 text-center text-base">{item.icon}</span>
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-navy-700/8 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose/25 bg-rose/8 px-4 py-3.5 text-[15px] font-semibold text-rose transition hover:border-rose/45 hover:bg-rose/14"
          >
            <span>🚪</span>
            {!collapsed && <span>Se déconnecter</span>}
          </button>
        </div>
      </nav>
    </>
  );
}
