"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { ToastProvider } from "./Toast";
import type { Session } from "@/lib/session";

export default function AppShell({
  session,
  children,
}: {
  session: Pick<Session, "name" | "role">;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Keep the session alive while the tab is open: every few minutes, renew the
  // access token and touch the Keycloak SSO session so idle time never runs out.
  useEffect(() => {
    const ping = () => {
      fetch("/api/auth/me", { cache: "no-store" }).catch(() => {});
    };
    const id = setInterval(ping, 2 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <ToastProvider>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={`min-h-screen min-w-0 transition-all duration-300 ${collapsed ? "lg:ml-16" : "lg:ml-60"}`}
      >
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-navy-700/10 bg-paper/85 px-3 backdrop-blur-md sm:gap-3 sm:px-5">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-700/70 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
          >
            <i className="bi bi-list text-2xl" aria-hidden />
          </button>
          <span className="flex-1" />
          <NotificationBell />
          <span className="hidden max-w-[16rem] truncate text-sm text-navy-700/70 sm:inline">
            {session.name} <span className="text-navy-700/35">· {session.role}</span>
          </span>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-[12px] font-bold text-white sm:hidden"
            title={`${session.name} · ${session.role}`}
            aria-label={session.name}
          >
            {session.name.trim().slice(0, 1).toUpperCase()}
          </span>
        </header>

        <main className="min-w-0 p-3.5 sm:p-6 lg:p-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
