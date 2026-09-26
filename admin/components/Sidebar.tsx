"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/** icon = a Bootstrap Icons class name (font imported in app/layout.tsx). */
type NavLink = { label: string; href: string; icon: string; soon?: boolean };
type NavGroup = { label: string; items: NavLink[] };

// Full target IA (this session's brief, Section 12). Stale as of 15 Sep
// 2026 (backoffice audit): most of the IA is now wired to real pages — only
// the two remaining explicitly `soon: true` items below ("Statistiques",
// "Revenus") are still disabled, labeled placeholders rather than dead
// links or invented content. Everything else in GROUPS routes to a real,
// working page.
const GROUPS: NavGroup[] = [
  {
    label: "Opérations",
    items: [
      { label: "Nouvelle réservation", href: "/reservations/new", icon: "bi-plus-circle" },
      { label: "Réservations hébergement", href: "/reservations/hebergements", icon: "bi-house-heart" },
      { label: "Réservations circuits", href: "/reservations/circuits", icon: "bi-map" },
      { label: "Toutes les réservations", href: "/reservations", icon: "bi-calendar-check" },
      { label: "Clients", href: "/clients", icon: "bi-people" },
      { label: "Guides", href: "/guides", icon: "bi-compass" },
      { label: "Chauffeurs", href: "/chauffeurs", icon: "bi-car-front" },
      { label: "Paiements", href: "/operations/paiements", icon: "bi-credit-card" },
      { label: "Factures", href: "/operations/factures", icon: "bi-receipt" },
      { label: "Proformas", href: "/operations/proformas", icon: "bi-file-earmark-text" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { label: "Hébergements", href: "/catalogue/hebergements", icon: "bi-house-heart" },
      { label: "Circuits", href: "/catalogue/tours", icon: "bi-map" },
      { label: "Améliorations circuits", href: "/catalogue/ameliorations", icon: "bi-arrow-up-circle" },
      { label: "Activités", href: "/catalogue/extras", icon: "bi-lightning-charge" },
      { label: "Véhicules & transport", href: "/catalogue/guides-transport", icon: "bi-truck" },
      { label: "Langues", href: "/catalogue/langues", icon: "bi-translate" },
      { label: "Disponibilités", href: "/catalogue/disponibilites", icon: "bi-calendar3" },
    ],
  },
  {
    label: "Contenu",
    items: [
      { label: "Pages", href: "/content/pages", icon: "bi-files" },
      { label: "Blocs de contenu", href: "/content/blocks", icon: "bi-boxes" },
      { label: "Textes des formulaires", href: "/content/textes-formulaires", icon: "bi-input-cursor-text" },
      { label: "Navigation", href: "/content/navigation", icon: "bi-link-45deg" },
      { label: "Médiathèque", href: "/content/media", icon: "bi-images" },
      { label: "Photos du site", href: "/content/photos-du-site", icon: "bi-card-image" },
      { label: "Galerie photos", href: "/content/gallery", icon: "bi-image" },
      { label: "Avis clients", href: "/content/avis", icon: "bi-star" },
      { label: "Avis Google & autres", href: "/content/avis-externes", icon: "bi-google" },
    ],
  },
  {
    label: "SEO",
    items: [
      { label: "Pages SEO", href: "/seo/pages", icon: "bi-search" },
      { label: "Redirections", href: "/seo/redirections", icon: "bi-signpost-split" },
      { label: "Sitemap", href: "/seo/sitemap", icon: "bi-diagram-3" },
      { label: "Audit SEO", href: "/seo/audit", icon: "bi-clipboard-check" },
      { label: "Analytics & Search Console", href: "/seo/analytics", icon: "bi-graph-up-arrow" },
    ],
  },
  {
    label: "Analytique",
    items: [
      { label: "Statistiques", href: "#", icon: "bi-bar-chart", soon: true },
      { label: "Revenus", href: "#", icon: "bi-cash-coin", soon: true },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Utilisateurs", href: "/administration/utilisateurs", icon: "bi-person-badge" },
      { label: "Rôles & permissions", href: "/administration/roles", icon: "bi-shield-lock" },
      { label: "Rôles personnalisés", href: "/administration/roles-personnalises", icon: "bi-boxes" },
      { label: "Journal d’activité", href: "/administration/journal", icon: "bi-clock-history" },
      { label: "Maintenance", href: "/administration/maintenance", icon: "bi-cone-striped" },
      { label: "Newsletter", href: "/administration/newsletter", icon: "bi-envelope" },
      { label: "Paramètres", href: "/administration/parametres", icon: "bi-gear" },
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
        className={`fixed inset-y-0 left-0 z-[1000] flex flex-col border-r border-white/5 bg-navy-950 shadow-[4px_0_24px_rgba(3,13,26,0.25)] transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex min-h-20 items-center justify-between gap-2 border-b border-white/8 px-4 py-6">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" width={36} height={36} className="h-9 w-9 flex-shrink-0 rounded-full" />
            {!collapsed && (
              <span className="whitespace-nowrap text-[14px] font-bold tracking-tight text-white">Dunes Insolites</span>
            )}
          </div>
          <button
            className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-white/60 transition hover:border-gold/50 hover:text-gold-light lg:flex"
            onClick={onToggleCollapsed}
            title={collapsed ? "Développer" : "Réduire"}
          >
            <i className={`bi ${collapsed ? "bi-chevron-right" : "bi-chevron-left"}`} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Link
            href="/"
            title="Tableau de bord"
            className={`mb-4 flex items-center gap-3 rounded-lg border-l-4 px-3 py-3.5 text-[15px] font-medium transition ${
              pathname === "/"
                ? "border-gold bg-gold/15 text-gold-light"
                : "border-transparent text-white/60 hover:bg-white/8 hover:text-white"
            }`}
          >
            <i className="bi bi-speedometer2 w-6 flex-shrink-0 text-center text-lg leading-none" aria-hidden />
            {!collapsed && <span className="truncate">Tableau de bord</span>}
          </Link>

          {GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/30">
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
                          className="flex cursor-not-allowed items-center gap-3 rounded-lg border-l-4 border-transparent px-3 py-2.5 text-[14px] font-medium text-white/25"
                        >
                          <i className={`bi ${item.icon} w-6 flex-shrink-0 text-center text-[17px] leading-none`} aria-hidden />
                          {!collapsed && (
                            <>
                              <span className="truncate">{item.label}</span>
                              <span className="ml-auto rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/35">
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
                              ? "border-gold bg-gold/15 text-gold-light"
                              : "border-transparent text-white/60 hover:bg-white/8 hover:text-white"
                          }`}
                        >
                          <i className={`bi ${item.icon} w-6 flex-shrink-0 text-center text-[17px] leading-none`} aria-hidden />
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

        <div className="border-t border-white/8 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose/40 bg-rose/10 px-4 py-3.5 text-[15px] font-semibold text-[#f19a90] transition hover:border-rose/60 hover:bg-rose/20"
          >
            <i className="bi bi-box-arrow-right" aria-hidden />
            {!collapsed && <span>Se déconnecter</span>}
          </button>
        </div>
      </nav>
    </>
  );
}
