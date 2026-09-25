"use client";

import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { formatTourDuration } from "@/lib/tourDuration";
import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/NotificationBell";
import FavoritesLink from "@/components/FavoritesLink";
import { logout } from "@/lib/api";
import { site } from "@/lib/site";
import type { Activity, Stay, Tour } from "@/lib/types";

type NavEntry = { label: string; href: string; menu?: "experiences" | "stays" };
type NavListEntry = {
  label: string;
  detail: string;
  href: string;
  image: string;
  /** Nested entries shown under this one - a stay's accommodation types. */
  children?: NavListEntry[];
};
type PrimaryNavItem = {
  label: string;
  href: string;
  items?: NavListEntry[];
  allLabel?: string;
};

function DrawerIcon({ href }: { href: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    "aria-hidden": true,
  } as const;

  if (href === "/circuits") return <svg {...common}><path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z" /><path d="M9 4v14M15 6v14" /></svg>;
  if (href === "/camp") return <svg {...common}><path d="M3 18h18M5 18v-7h14v7M7 11V7h4v4M13 11V5h4v6" /><path d="M8 14h2M14 14h2" /></svg>;
  if (href === "/activities") return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>;
  if (href === "/guides") return <svg {...common}><path d="M6 3h9l3 3v15H6V3Z" /><path d="M15 3v4h4M9 11h6M9 15h6" /></svg>;
  if (href === "/faq") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.1 2.2c-.9.4-.9 1-.9 1.8M12 17h.01" /></svg>;
  if (href === "/contact") return <svg {...common}><path d="M4 5h16v11H8l-4 4V5Z" /><path d="M8 9h8M8 12h5" /></svg>;
  if (href === "/safety") return <svg {...common}><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (href === "/book") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
  return <svg {...common}><path d="M3 11 12 3l9 8" /><path d="M5 10v11h14V10M9 21v-6h6v6" /></svg>;
}

function MenuChevron() {
  return <svg className="drawer-row-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Header({
  activities,
  stays,
  tours,
  navItems,
}: {
  activities: Activity[];
  stays: Stay[];
  tours: Tour[];
  navItems: NavEntry[];
}) {
  const t = useTranslations("nav");
  const tAccount = useTranslations("account");
  const tCircuits = useTranslations("circuitsSection");
  const tMenu = useTranslations("mobileMenu");
  const tDuration = useTranslations("tourDuration");
  const pathname = usePathname();
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  // Mobile drawer disclosures ("camp" = the Accommodation list, "camp:<slug>" =
  // one stay's accommodation types). Closed by default.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (key: string) => setExpanded((cur) => ({ ...cur, [key]: !cur[key] }));

  // Desktop: the second list that comes out to the side of a hovered row. It is
  // rendered outside the (scrolling) list so it is never clipped; `top` is the
  // hovered row's offset inside its dropdown.
  const [flyout, setFlyout] = useState<{ menu: string; href: string; top: number; side: "right" | "left" } | null>(null);
  const flyoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelFlyoutClose = () => {
    if (flyoutTimer.current) clearTimeout(flyoutTimer.current);
    flyoutTimer.current = null;
  };
  const closeFlyoutSoon = () => {
    cancelFlyoutClose();
    flyoutTimer.current = setTimeout(() => setFlyout(null), 140);
  };
  function openFlyout(menu: string, href: string, row: HTMLElement) {
    cancelFlyoutClose();
    const panel = row.closest(".nav-dropdown");
    if (!panel) return;
    const rowRect = row.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    // Flip to the left when there is no room on the right of the viewport.
    const side = panelRect.right + 6 + 320 > window.innerWidth - 12 ? "left" : "right";
    setFlyout({ menu, href, top: Math.max(0, rowRect.top - panelRect.top), side });
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => setLoggedIn(!!data.session))
      .catch(() => setLoggedIn(false));
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenAt(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  async function onLogout() {
    await logout();
    setLoggedIn(false);
    setOpenAt(null);
    router.push("/");
    router.refresh();
  }

  const knownRoutes = new Set(navItems.map((item) => item.href));
  const primaryNav: PrimaryNavItem[] = [
    { label: t("theCamp"), href: "/about" },
    {
      label: t("circuits"),
      href: "/circuits",
      items: tours.map((tour) => ({
        label: tour.title,
        detail: formatTourDuration(tDuration, tour),
        href: `/circuits/${tour.slug}`,
        image: tour.coverImage || tour.gallery[0] || "/images/gate.jpg",
        // A circuit that sleeps at the camp offers the camp's accommodation
        // types; each links to that type's own page on the camp stay.
        children: tour.overnightsAtCamp && tour.campStaySlug
          ? (tour.accommodations ?? []).map((tier) => ({
              label: tier.title,
              detail: tier.sleeps,
              href: `/camp/${tour.campStaySlug}/${tier.slug}`,
              image: tier.image || tour.coverImage || "/images/under-hero.jpg",
            }))
          : [],
      })),
      allLabel: tCircuits("seeAll"),
    },
    {
      label: t("accommodation"),
      href: "/camp",
      items: stays.map((stay) => ({
        label: stay.title,
        detail: stay.tagline,
        href: `/camp/${stay.slug}`,
        image: stay.image || stay.gallery[0] || "/images/under-hero.jpg",
        // Only stays that actually offer accommodation types get a submenu.
        children: (stay.accommodations ?? []).map((tier) => ({
          label: tier.title,
          detail: tier.sleeps,
          href: `/camp/${stay.slug}/${tier.slug}`,
          image: tier.image || stay.image || "/images/under-hero.jpg",
        })),
      })),
      allLabel: t("seeAllStays"),
    },
    {
      label: t("activities"),
      href: "/activities",
      items: activities.map((activity) => ({
        label: activity.title,
        detail: activity.tagline,
        href: `/activities/${activity.slug}`,
        image: activity.cardImage || activity.heroImage || "/images/hero-combined.jpg",
      })),
      allLabel: t("seeAllExperiences"),
    },
    { label: t("articles"), href: "/guides" },
    { label: t("faq"), href: "/faq" },
    { label: t("contact"), href: "/contact" },
  ].filter(
    (item) =>
      knownRoutes.size === 0 ||
      knownRoutes.has(item.href) ||
      // Core static site sections — every one of these routes always
      // exists in the app (see DrawerIcon's dedicated icon per href just
      // above), so their nav visibility must never depend on whether the
      // admin has also added a matching row to navigation_items. Found
      // live: a database with only "Circuits" seeded in navigation_items
      // (e.g. a freshly reset dev DB, before the admin configures the
      // rest of the CMS nav) silently dropped "The Camp"/"Accommodation"/
      // "Activities" from the header entirely, even though those pages
      // work fine — /circuits, /guides and /faq were already exempted
      // the same way, this just closes the gap for the other three.
      item.href === "/about" ||
      item.href === "/circuits" ||
      item.href === "/camp" ||
      item.href === "/activities" ||
      item.href === "/guides" ||
      item.href === "/faq" ||
      item.href === "/contact",
  );

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <>
      <header className={`site-header pro-header${condensed ? " condensed" : ""}${open ? " menu-open" : ""}`}>
        <div className="header-main">
          <Link className="brand" href="/" aria-label={site.name}>
            <Image className="brand-mark" src="/logo-mark.png" alt="" width={42} height={42} preload />
            <span className="brand-text">
              <span className="bn">{site.name}</span>
              <span className="bl">Sabria · Sahara</span>
            </span>
          </Link>

          <nav className="nav primary-nav" aria-label="Primary navigation">
            {primaryNav.map((item) => (
              <div
                className={`primary-item${item.items?.length ? " has-dropdown" : ""}`}
                key={item.href}
                onMouseLeave={() => setFlyout(null)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFlyout(null);
                }}
              >
                <Link
                  href={item.href}
                  data-active={isActive(item.href)}
                  aria-haspopup={item.items?.length ? "true" : undefined}
                >
                  {item.label}
                  {item.items?.length ? <span className="nav-chevron" aria-hidden="true">⌄</span> : null}
                </Link>

                {item.items?.length ? (
                  <div className="nav-dropdown">
                    <div className="nav-dropdown-list">
                      {item.items.map((entry) => (
                        <Link
                          href={entry.href}
                          key={entry.href}
                          data-flyout={entry.children?.length ? "true" : undefined}
                          onMouseEnter={(e) => (entry.children?.length ? openFlyout(item.href, entry.href, e.currentTarget) : setFlyout(null))}
                          onFocus={(e) => (entry.children?.length ? openFlyout(item.href, entry.href, e.currentTarget) : setFlyout(null))}
                          onMouseLeave={closeFlyoutSoon}
                        >
                          <span className="nav-dropdown-thumb" aria-hidden="true">
                            <Image src={entry.image} alt="" fill sizes="82px" />
                          </span>
                          <span className="nav-dropdown-copy">
                            <strong>{entry.label}</strong>
                            <small>{entry.detail}</small>
                          </span>
                          <span className="nav-dropdown-arrow" aria-hidden="true">{entry.children?.length ? "›" : "↗"}</span>
                        </Link>
                      ))}
                    </div>
                    {flyout && flyout.menu === item.href && (() => {
                      const parent = item.items?.find((entry) => entry.href === flyout.href);
                      if (!parent?.children?.length) return null;
                      return (
                        <div
                          className="nav-flyout"
                          data-side={flyout.side}
                          style={{ top: flyout.top }}
                          onMouseEnter={cancelFlyoutClose}
                          onMouseLeave={closeFlyoutSoon}
                        >
                          <div className="nav-dropdown-list nav-flyout-list">
                            {parent.children.map((child) => (
                              <Link href={child.href} key={child.href}>
                                <span className="nav-dropdown-thumb" aria-hidden="true">
                                  <Image src={child.image} alt="" fill sizes="82px" />
                                </span>
                                <span className="nav-dropdown-copy">
                                  <strong>{child.label}</strong>
                                  <small>{child.detail}</small>
                                </span>
                                <span className="nav-dropdown-arrow" aria-hidden="true">↗</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    <Link href={item.href} className="nav-dropdown-all">
                      {item.allLabel} <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          <div className="header-actions">
            <div className="header-language">
              <LanguageSwitcher panelAnchor="header" />
            </div>

            <FavoritesLink loggedIn={loggedIn} />

            {loggedIn ? (
              <>
                <NotificationBell loggedIn />
                <Link className="header-account" href="/account">
                  {t("myAccount")}
                </Link>
              </>
            ) : (
              <Link className="header-account" href="/login">
                {t("logIn")}
              </Link>
            )}

            <Link href="/book" className="header-cta">
              {t("bookDirect")}
              <span aria-hidden="true">↗</span>
            </Link>

            <button
              className="burger"
              aria-label={open ? t("closeMenu") : t("openMenu")}
              aria-expanded={open}
              aria-controls="mobile-drawer"
              onClick={() => setOpenAt(open ? null : pathname)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className="drawer pro-drawer" id="mobile-drawer" data-open={open} aria-hidden={!open}>
        <div className="drawer-scroll">
          <section className="drawer-section">
            <nav className="drawer-menu-list" aria-label="Mobile navigation">
              {primaryNav.filter((item) => item.href !== "/faq" && item.href !== "/contact").map((item) =>
                (item.href === "/camp" || item.href === "/circuits") && item.items?.length ? (
                  <div className="drawer-group" key={item.href}>
                    <div className="drawer-group-head">
                      <Link href={item.href} tabIndex={open ? 0 : -1}>
                        <DrawerIcon href={item.href} />
                        <span>{item.label}</span>
                      </Link>
                      <button
                        type="button"
                        className="drawer-group-toggle"
                        aria-expanded={!!expanded[item.href]}
                        aria-label={`${tMenu("toggleSubmenu")}: ${item.label}`}
                        tabIndex={open ? 0 : -1}
                        onClick={() => toggleExpanded(item.href)}
                      >
                        <MenuChevron />
                      </button>
                    </div>
                    <div className="drawer-sub" data-open={!!expanded[item.href]}>
                      <div>
                        {item.items.map((entry) => (
                          <div className="drawer-sub-entry" key={entry.href}>
                            <div className="drawer-group-head">
                              <Link href={entry.href} tabIndex={open && expanded[item.href] ? 0 : -1}>
                                <span className="nav-dropdown-thumb" aria-hidden="true">
                                  <Image src={entry.image} alt="" fill sizes="64px" />
                                </span>
                                <span className="nav-dropdown-copy">
                                  <strong>{entry.label}</strong>
                                  <small>{entry.detail}</small>
                                </span>
                              </Link>
                              {entry.children?.length ? (
                                <button
                                  type="button"
                                  className="drawer-group-toggle"
                                  aria-expanded={!!expanded[`${item.href}:${entry.href}`]}
                                  aria-label={`${tMenu("toggleSubmenu")}: ${entry.label}`}
                                  tabIndex={open && expanded[item.href] ? 0 : -1}
                                  onClick={() => toggleExpanded(`${item.href}:${entry.href}`)}
                                >
                                  <MenuChevron />
                                </button>
                              ) : null}
                            </div>
                            {entry.children?.length ? (
                              <div className="drawer-sub drawer-sub-nested" data-open={!!expanded[`${item.href}:${entry.href}`]}>
                                <div>
                                  {entry.children.map((child) => (
                                    <Link
                                      key={child.href}
                                      href={child.href}
                                      tabIndex={open && expanded[item.href] && expanded[`${item.href}:${entry.href}`] ? 0 : -1}
                                    >
                                      <span className="nav-dropdown-thumb" aria-hidden="true">
                                        <Image src={child.image} alt="" fill sizes="52px" />
                                      </span>
                                      <span className="nav-dropdown-copy">
                                        <strong>{child.label}</strong>
                                        <small>{child.detail}</small>
                                      </span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link key={item.href} href={item.href} tabIndex={open ? 0 : -1}>
                    <DrawerIcon href={item.href} />
                    <span>{item.label}</span>
                    <MenuChevron />
                  </Link>
                ),
              )}
              <Link href="/book" tabIndex={open ? 0 : -1}>
                <DrawerIcon href="/book" />
                <span>{t("bookDirect")}</span>
                <MenuChevron />
              </Link>
            </nav>
          </section>

          <section className="drawer-section">
            <h2>{tMenu("profile")}</h2>
            <div className="drawer-menu-list">
              <Link href={loggedIn ? "/account" : "/login"} tabIndex={open ? 0 : -1}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
                <span>{loggedIn ? t("myAccount") : t("logIn")}</span>
                <MenuChevron />
              </Link>
              <FavoritesLink loggedIn={loggedIn} showLabel />
              {loggedIn && <NotificationBell loggedIn showLabel />}
              <div className="drawer-language-row">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" /></svg>
                <span>{tMenu("language")}</span>
                <LanguageSwitcher showName />
              </div>
              {loggedIn && (
                <button type="button" className="drawer-logout" onClick={onLogout} tabIndex={open ? 0 : -1}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" /></svg>
                  <span>{tAccount("logout")}</span>
                </button>
              )}
            </div>
          </section>

          <section className="drawer-section">
            <h2>{tMenu("help")}</h2>
            <nav className="drawer-menu-list" aria-label={tMenu("help")}>
              {[{ href: "/faq", label: t("faq") }, { href: "/contact", label: t("contact") }, { href: "/safety", label: t("safety") }].map((item) => (
                <Link key={item.href} href={item.href} tabIndex={open ? 0 : -1}>
                  <DrawerIcon href={item.href} />
                  <span>{item.label}</span>
                  <MenuChevron />
                </Link>
              ))}
            </nav>
          </section>
        </div>
      </div>
    </>
  );
}
