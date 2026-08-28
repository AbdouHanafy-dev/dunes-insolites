"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
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

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={`min-h-screen transition-all duration-300 ${collapsed ? "lg:ml-16" : "lg:ml-60"}`}
      >
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-navy-700/8 bg-paper/85 px-5 backdrop-blur-md">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-700/70 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
          >
            ☰
          </button>
          <span className="flex-1" />
          <span className="text-sm text-navy-700/70">
            {session.name} <span className="text-navy-700/35">· {session.role}</span>
          </span>
        </header>

        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </>
  );
}
