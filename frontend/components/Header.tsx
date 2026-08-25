"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { nav, site } from "@/lib/site";
import type { Activity, Stay } from "@/lib/types";

/** Everything the mega-menu card needs. `Activity.cardImage` and
 *  `Stay.image` get normalized to `image` when each menu's item list is
 *  built below, so one render path covers both menus. */
type MegaMenuItem = { slug: string; title: string; tagline: string; image: string };

export default function Header({
  activities,
  stays,
}: {
  activities: Activity[];
  stays: Stay[];
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  // Two independent states. `scrolled` controls contrast (the landing hero is
  // the only place the bar may go translucent). `condensed` collapses the
  // utility row once you start reading, on every page.
  const [scrolled, setScrolled] = useState(!isLanding);
  const [condensed, setCondensed] = useState(false);

  // The drawer remembers which route opened it, so any navigation closes it.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);

  const [menu, setMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(!isLanding || window.scrollY > window.innerHeight * 0.92);
      setCondensed(window.scrollY > 60);
    };
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isLanding]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenAt(null);
      setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the dropdown on a click anywhere outside it.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const hoverOpen = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenu(label);
  };
  // Small grace period so the pointer can cross the gap into the panel.
  const hoverClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenu(null), 160);
  };

  const isActive = (href: string) =>
    href.startsWith("/#") ? false : pathname === href || pathname.startsWith(`${href}/`);

  const waHref = `https://wa.me/${site.whatsapp.replace(/[^\d]/g, "")}`;

  const megaMenus: Record<
    "experiences" | "stays",
    { items: MegaMenuItem[]; hrefPrefix: string; seeAllHref: string; seeAllLabel: string }
  > = {
    experiences: {
      items: activities.map((a) => ({
        slug: a.slug,
        title: a.title,
        tagline: a.tagline,
        image: a.cardImage,
      })),
      hrefPrefix: "/activities",
      seeAllHref: "/activities",
      seeAllLabel: "See all experiences →",
    },
    stays: {
      items: stays.map((s) => ({ slug: s.slug, title: s.title, tagline: s.tagline, image: s.image })),
      hrefPrefix: "/camp",
      seeAllHref: "/camp",
      seeAllLabel: "See all stays →",
    },
  };

  return (
    <>
      <header
        className={`site-header${scrolled ? " scrolled" : ""}${condensed ? " condensed" : ""}${open ? " menu-open" : ""}`}
        id="header"
      >
        {/* utility row — collapses away as soon as the page moves */}
        <div className="header-utility">
          <div className="u-group">
            <a className="u-link" href={waHref} target="_blank" rel="noreferrer noopener">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.69 8.23-8.24 8.23z" />
              </svg>
              {site.whatsapp}
            </a>
            <a className="u-link u-hide-sm" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </div>

          <div className="u-group">
            <LanguageSwitcher panelAnchor="header" />
            <span className="u-sep" aria-hidden="true" />
            <Link className="u-link" href="/login">
              Log in
            </Link>
            <Link className="u-link u-strong" href="/signup">
              Sign up
            </Link>
          </div>
        </div>

        {/* main row */}
        <div className="header-main">
          <Link className="brand" href="/">
            {/* Decorative: the name sits right beside it as real text, so
                repeating it in alt would just make screen readers say it
                twice. */}
            <Image
              className="brand-mark"
              src="/logo-mark.png"
              alt=""
              width={40}
              height={40}
              preload
            />
            <span className="brand-text">
              <span className="bn">{site.name}</span>
              <span className="bl">{site.brandLine}</span>
            </span>
          </Link>

          <nav className="nav" ref={menuRef}>
            {nav.map((item) => {
              // Captured as a local so the "which menu" type stays narrowed
              // inside the .map() below — TS doesn't carry that narrowing
              // through a property access into a nested closure.
              const menuKey = item.menu;
              if (!menuKey) {
                return (
                  <div key={item.href} className="nav-item">
                    <Link href={item.href} data-active={isActive(item.href)}>
                      {item.label}
                    </Link>
                  </div>
                );
              }

              const { items, hrefPrefix, seeAllHref, seeAllLabel } = megaMenus[menuKey];

              return (
                <div
                  key={item.href}
                  className="nav-item has-menu"
                  onMouseEnter={() => hoverOpen(item.label)}
                  onMouseLeave={hoverClose}
                >
                  <Link
                    href={item.href}
                    data-active={isActive(item.href)}
                    aria-expanded={menu === item.label}
                    aria-haspopup="true"
                    onFocus={() => hoverOpen(item.label)}
                    onClick={() => setMenu(null)}
                  >
                    {item.label}
                    <span className="chev" aria-hidden="true" />
                  </Link>

                  {menu === item.label && (
                    <div className="mega" onMouseEnter={() => hoverOpen(item.label)}>
                      <div className="mega-grid">
                        {items.map((i) => (
                          <Link key={i.slug} href={`${hrefPrefix}/${i.slug}`} className="mega-card">
                            <span className="thumb">
                              <Image
                                src={i.image}
                                alt=""
                                fill
                                sizes="120px"
                                style={{ objectFit: "cover" }}
                              />
                            </span>
                            <span className="txt">
                              <span className="t">{i.title}</span>
                              <span className="d">{i.tagline}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                      <Link href={seeAllHref} className="mega-all" onClick={() => setMenu(null)}>
                        {seeAllLabel}
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <Link href="/book" className="header-cta">
            Book direct
          </Link>

          {/* Grouped with the burger so the pair sits together at the right
              edge — `.header-main`'s `space-between` would otherwise spread
              a lone third item toward the middle of the row instead of
              hugging the button next to it. */}
          <div className="header-mobile-controls">
            <div className="header-lang-mobile">
              <LanguageSwitcher panelAnchor="header" />
            </div>

            <button
              className="burger"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-drawer"
              onClick={() => setOpen(!open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className="drawer" id="mobile-drawer" data-open={open} aria-hidden={!open}>
        <div className="drawer-scroll">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} tabIndex={open ? 0 : -1}>
              {item.label}
              <span className="nav-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}

          <div className="drawer-auth">
            <Link href="/login" tabIndex={open ? 0 : -1}>
              Log in
            </Link>
            <Link href="/signup" tabIndex={open ? 0 : -1}>
              Sign up
            </Link>
          </div>

          <Link href="/book" className="header-cta drawer-cta" tabIndex={open ? 0 : -1}>
            Book direct
            <span className="drawer-cta-arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <a
            className="drawer-wa"
            href={waHref}
            target="_blank"
            rel="noreferrer noopener"
            tabIndex={open ? 0 : -1}
          >
            <span className="drawer-wa-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.69 8.23-8.24 8.23z" />
              </svg>
            </span>
            <span>
              WhatsApp <strong>{site.whatsapp}</strong>
            </span>
          </a>
        </div>
      </div>
    </>
  );
}
