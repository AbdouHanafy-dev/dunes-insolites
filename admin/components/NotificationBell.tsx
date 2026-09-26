"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import {
  NOTIFICATION_POLL_MS,
  badgeLabel,
  latest,
  notificationHref,
  timeAgo,
  type AdminNotification,
} from "@/lib/notifications";

/**
 * The bell in the header: how many notifications are unread (a new booking, a payment…),
 * the latest ones on click, and a jump to the reservation they are about. It asks the
 * server for the count every 30 seconds and whenever the tab comes back to the front; when
 * the count goes UP a toast says so, so a booking is noticed even with the list closed.
 */
export default function NotificationBell() {
  const router = useRouter();
  const toast = useToast();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const previous = useRef<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy/notifications/unread-count", { cache: "no-store" });
      if (!res.ok) return;
      const count = Number(await res.text());
      if (!Number.isFinite(count)) return;
      setUnread(count);
      // Not on the first read (opening the page is not news), only when it grows.
      if (previous.current !== null && count > previous.current) {
        toast.success(count - previous.current > 1 ? "Nouvelles notifications" : "Nouvelle notification — voir la cloche");
      }
      previous.current = count;
    } catch {
      // offline or backend restarting: keep the last count, try again next tick
    }
  }, [toast]);

  const loadList = useCallback(async () => {
    setFailed(false);
    try {
      const res = await fetch("/api/proxy/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setItems(latest((await res.json()) as AdminNotification[]));
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    // First read right after mount, then every 30 s.
    const first = setTimeout(() => void refreshCount(), 0);
    const id = setInterval(() => void refreshCount(), NOTIFICATION_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshCount]);

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void loadList();
  }

  async function openNotification(n: AdminNotification) {
    setOpen(false);
    if (!n.isRead) {
      setItems((current) => current?.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)) ?? null);
      setUnread((c) => Math.max(0, c - 1));
      previous.current = Math.max(0, (previous.current ?? 1) - 1);
      void fetch(`/api/proxy/notifications/${n.notificationId}/read`, { method: "PATCH" }).catch(() => {});
    }
    const href = notificationHref(n);
    if (href) router.push(href);
  }

  async function markAllRead() {
    setItems((current) => current?.map((x) => ({ ...x, isRead: true })) ?? null);
    setUnread(0);
    previous.current = 0;
    try {
      await fetch("/api/proxy/notifications/read-all", { method: "PATCH" });
    } catch {
      void refreshCount();
    }
  }

  const badge = badgeLabel(unread);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={badge ? `Notifications, ${unread} non lue(s)` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-navy-700/70 transition hover:bg-navy-700/8"
      >
        <i className={`bi ${unread > 0 ? "bi-bell-fill" : "bi-bell"} text-lg`} aria-hidden />
        {badge && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-rose px-1 text-center text-[10px] font-bold leading-[18px] text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-navy-700/10 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem]">
          <div className="flex items-center justify-between border-b border-navy-700/10 px-4 py-3">
            <span className="text-sm font-bold text-navy-800">Notifications</span>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unread === 0}
              className="text-xs font-semibold text-navy-700 hover:underline disabled:opacity-40"
            >
              Tout marquer comme lu
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto sm:max-h-96">
            {failed ? (
              <p className="px-4 py-8 text-center text-sm text-rose">Impossible de charger les notifications.</p>
            ) : items === null ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chargement…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Aucune notification.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => (
                  <li key={n.notificationId}>
                    <button
                      type="button"
                      onClick={() => void openNotification(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 ${n.isRead ? "" : "bg-gold/5"}`}
                    >
                      <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-rose"}`} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-navy-800">{n.title}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-gray-600">{n.message}</span>
                        <span className="mt-1 block text-[11px] text-gray-400">{timeAgo(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
