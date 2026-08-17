"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { nav, site } from "@/lib/site";
import type { Activity } from "@/lib/types";

export default function Header({ activities }: { activities: Activity[] }) {
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

  return (
    <>
      <header
        className={`site-header${scrolled ? " scrolled" : ""}${condensed ? " condensed" : ""}`}
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
            <LanguageSwitcher />
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
            {nav.map((item) =>
              item.menu ? (
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
                        {activities.map((a) => (
                          <Link key={a.slug} href={`/activities/${a.slug}`} className="mega-card">
                            <span className="thumb">
                              <Image
                                src={a.cardImage}
                                alt=""
                                fill
                                sizes="120px"
                                style={{ objectFit: "cover" }}
                              />
                            </span>
                            <span className="txt">
                              <span className="t">{a.title}</span>
                              <span className="d">{a.tagline}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                      <Link href="/activities" className="mega-all" onClick={() => setMenu(null)}>
                        See all experiences →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div key={item.href} className="nav-item">
                  <Link href={item.href} data-active={isActive(item.href)}>
                    {item.label}
                  </Link>
                </div>
              ),
            )}
          </nav>

          <Link href="/book" className="header-cta">
            Book direct
          </Link>

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
      </header>

      <div className="drawer" id="mobile-drawer" data-open={open} aria-hidden={!open}>
        <div className="drawer-scroll">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} tabIndex={open ? 0 : -1}>
              {item.label}
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
          </Link>

          <a
            className="drawer-wa"
            href={waHref}
            target="_blank"
            rel="noreferrer noopener"
            tabIndex={open ? 0 : -1}
          >
            WhatsApp {site.whatsapp}
          </a>
        </div>
      </div>
    </>
  );
}
