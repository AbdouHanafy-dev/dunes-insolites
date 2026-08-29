"use client";

import { createContext, useCallback, useContext, useState } from "react";

/**
 * The public vitrine's own toast system — same shape as
 * admin/components/Toast.tsx (this app's backoffice), a separate app with
 * its own copy since the two share no runtime, but deliberately styled
 * with this app's own tokens (--accent/--ink from globals.css) rather than
 * the admin's navy/gold.
 *
 * Confirmations only (booking sent, message sent, notification dismissed).
 * The existing persistent inline `.alert`/`.alert.ok` divs in
 * BookingFlow/ContactForm/ReviewForm/StayReservationForm/AuthForm stay for
 * validation errors, which need to stay on screen until fixed — an
 * auto-dismissing toast is the wrong shape for that, same reasoning the
 * admin toast system already used.
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
      <div className="toast-viewport">
        {items.map((t) => (
          <div key={t.id} role="status" className={`toast-item toast-${t.kind}`}>
            <span className="toast-icon">{t.kind === "success" ? "✓" : "✕"}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Throws outside a ToastProvider — mounted once in app/[locale]/layout.tsx. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
