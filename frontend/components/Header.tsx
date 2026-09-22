"use client";

import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/NotificationBell";
import { logout } from "@/lib/api";
import { site } from "@/lib/site";
import type { Activity, Stay, Tour } from "@/lib/types";

type NavEntry = { label: string; href: string; menu?: "experiences" | "stays" };
type PrimaryNavItem = {
  label: string;
  href: string;
  items?: { label: string; detail: string; href: string; image: string }[];
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
  const pathname = usePathname();
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;

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
        detail: tour.duration,
        href: `/circuits/${tour.slug}`,
        image: tour.coverImage || tour.gallery[0] || "/images/gate.jpg",
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
  ].filter(
    (item) =>
      knownRoutes.size === 0 ||
      knownRoutes.has(item.href) ||
      item.href === "/circuits" ||
      item.href === "/guides" ||
      item.href === "/faq",
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
              <div className={`primary-item${item.items?.length ? " has-dropdown" : ""}`} key={item.href}>
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
                        <Link href={entry.href} key={entry.href}>
                          <span className="nav-dropdown-thumb" aria-hidden="true">
                            <Image src={entry.image} alt="" fill sizes="82px" />
                          </span>
                          <span className="nav-dropdown-copy">
                            <strong>{entry.label}</strong>
                            <small>{entry.detail}</small>
                          </span>
                          <span className="nav-dropdown-arrow" aria-hidden="true">↗</span>
                        </Link>
                      ))}
                    </div>
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
            <h2>{tMenu("explore", { place: "Sabria" })}</h2>
            <nav className="drawer-menu-list" aria-label="Mobile navigation">
              {primaryNav.filter((item) => item.href !== "/faq").map((item) => (
                <Link key={item.href} href={item.href} tabIndex={open ? 0 : -1}>
                  <DrawerIcon href={item.href} />
                  <span>{item.label}</span>
                  <MenuChevron />
                </Link>
              ))}
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
