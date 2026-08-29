"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/Toast";

type Notification = {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

/**
 * Makes the backend's real notification system (SseService,
 * NotificationController) visible for the first time — it existed, worked,
 * and was never consumed by any frontend (this app, the admin backoffice,
 * or the old Angular admin-app), confirmed by grepping all three before
 * building this.
 *
 * The SSE connection goes through /api/notifications/subscribe (this app's
 * own route, not the backend directly) — the access token lives only in
 * an httpOnly cookie, unreachable from client JS, so a plain browser
 * EventSource pointed at the backend could never authenticate. See that
 * route's own comment for the full reasoning.
 */
export default function NotificationBell({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations("notifications");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const [listRes, countRes] = await Promise.all([
      fetch("/api/notifications"),
      fetch("/api/notifications/unread-count"),
    ]);
    if (listRes.ok) setItems(await listRes.json());
    if (countRes.ok) setUnreadCount(await countRes.json());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    // A direct call to refresh() here trips react-hooks/set-state-in-effect
    // (setState called synchronously in an effect body) - deferring it into
    // a microtask, same fix used for admin/components/availability/
    // AvailabilityCalendar.tsx's identical effect earlier this session.
    Promise.resolve().then(refresh);

    const source = new EventSource("/api/notifications/subscribe");
    source.addEventListener("notification", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { title: string; message: string };
        toast.success(`${payload.title} — ${payload.message}`);
      } catch {
        // Malformed push payload - still worth refreshing below.
      }
      refresh();
    });
    // EventSource retries on its own after a network blip; nothing to do
    // here beyond letting the connection close on unmount.
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function onOpenNotification(n: Notification) {
    if (!n.isRead) {
      setItems((s) => s.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      const ok = await fetch(`/api/notifications/${n.notificationId}/read`, { method: "PATCH" });
      if (!ok.ok) {
        toast.error(t("markReadFailed"));
        refresh();
      }
    }
  }

  async function onMarkAllRead() {
    const before = items;
    setItems((s) => s.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
    const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
    if (!res.ok) {
      toast.error(t("markReadFailed"));
      setItems(before);
      refresh();
    }
  }

  async function onDelete(n: Notification, e: React.MouseEvent) {
    e.stopPropagation();
    const before = items;
    setItems((s) => s.filter((x) => x.notificationId !== n.notificationId));
    if (!n.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    const res = await fetch(`/api/notifications/${n.notificationId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t("deleted"));
    } else {
      toast.error(t("deleteFailed"));
      setItems(before);
      refresh();
    }
  }

  if (!loggedIn) return null;

  return (
    <div className="notif-bell" ref={panelRef}>
      <button
        type="button"
        className="notif-bell-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("bellLabel")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <span>{t("title")}</span>
            {unreadCount > 0 && (
              <button type="button" className="notif-mark-all" onClick={onMarkAllRead}>
                {t("markAllRead")}
              </button>
            )}
          </div>
          {!loaded ? (
            <p className="notif-empty">{t("loading")}</p>
          ) : items.length === 0 ? (
            <p className="notif-empty">{t("empty")}</p>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li
                  key={n.notificationId}
                  className={`notif-item ${n.isRead ? "" : "notif-unread"}`}
                  onClick={() => onOpenNotification(n)}
                >
                  <div className="notif-item-body">
                    <p className="notif-item-title">{n.title}</p>
                    <p className="notif-item-message">{n.message}</p>
                  </div>
                  <button
                    type="button"
                    className="notif-item-delete"
                    onClick={(e) => onDelete(n, e)}
                    aria-label={t("delete")}
                    title={t("delete")}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
