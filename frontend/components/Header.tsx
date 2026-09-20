"use client";

import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/NotificationBell";
import { logout, type SiteSettingsData } from "@/lib/api";
import { site } from "@/lib/site";
import type { Activity, Stay, Tour } from "@/lib/types";

type NavEntry = { label: string; href: string; menu?: "experiences" | "stays" };
type PrimaryNavItem = {
  label: string;
  href: string;
  items?: { label: string; detail: string; href: string; image: string }[];
  allLabel?: string;
};

export default function Header({
  activities,
  stays,
  tours,
  navItems,
  settings,
}: {
  activities: Activity[];
  stays: Stay[];
  tours: Tour[];
  navItems: NavEntry[];
  settings: SiteSettingsData;
}) {
  const t = useTranslations("nav");
  const tAccount = useTranslations("account");
  const tCircuits = useTranslations("circuitsSection");
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
  const waHref = `https://wa.me/${settings.whatsapp.replace(/[^\d]/g, "")}`;

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
          <p className="drawer-label">{site.name} · Sabria</p>
          <nav aria-label="Mobile navigation">
            {primaryNav.map((item, index) => (
              <Link key={item.href} href={item.href} tabIndex={open ? 0 : -1}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.label}</strong>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </nav>

          <div className="drawer-tools">
            <LanguageSwitcher />
            {loggedIn ? (
              <>
                <Link href="/account" tabIndex={open ? 0 : -1}>{t("myAccount")}</Link>
                <button type="button" onClick={onLogout} tabIndex={open ? 0 : -1}>{tAccount("logout")}</button>
              </>
            ) : (
              <Link href="/login" tabIndex={open ? 0 : -1}>{t("logIn")}</Link>
            )}
          </div>

          <div className="drawer-contact">
            <Link href="/book" className="drawer-book" tabIndex={open ? 0 : -1}>
              {t("bookDirect")} <span aria-hidden="true">↗</span>
            </Link>
            <a href={waHref} target="_blank" rel="noreferrer noopener" tabIndex={open ? 0 : -1}>
              WhatsApp · {settings.whatsapp}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
