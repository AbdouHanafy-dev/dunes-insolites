"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * Payload's most recognizable UX signature: a save/delete confirms with a
 * toast, not a silent redirect. Errors still get the existing inline
 * banners in CollectionEditor/CollectionList — a validation error needs to
 * stay on screen until it's fixed, an auto-dismissing toast is the wrong
 * shape for that. Toasts are for confirmations: "saved", "deleted",
 * "published".
 */
type ToastKind = "success" | "error";
type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 0;
const DISMISS_AFTER_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++nextId;
    setItems((s) => [...s, { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), DISMISS_AFTER_MS);
  }, []);

  const api: ToastApi = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-[2000] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex min-w-64 max-w-sm items-center gap-2.5 rounded-[10px] border bg-white px-4 py-3 text-[13px] font-medium shadow-[0_8px_24px_rgba(22,35,58,0.16)] ${
              t.kind === "success" ? "border-emerald/25 text-emerald" : "border-rose/25 text-rose"
            }`}
          >
            <span className="text-base leading-none">{t.kind === "success" ? "✓" : "✕"}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Throws outside a ToastProvider — every page under app/(app)/layout.tsx has one via AppShell. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
