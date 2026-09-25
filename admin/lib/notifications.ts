/** One notification of the signed-in staff member, as the backend returns it. */
export type AdminNotification = {
  notificationId: string;
  reservationId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

/** How often the bell asks for new notifications while the tab is open. */
export const NOTIFICATION_POLL_MS = 30_000;

/** How many notifications the dropdown shows: the latest, not the whole history. */
export const NOTIFICATION_LIST_LIMIT = 20;

/** "à l’instant", "il y a 5 min", "il y a 3 h", "hier", then the date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "à l’instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return then.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** The badge text: nothing at 0, the number up to 99, then "99+". */
export function badgeLabel(unread: number): string | null {
  if (!Number.isFinite(unread) || unread <= 0) return null;
  return unread > 99 ? "99+" : String(unread);
}

/** Where a notification leads: its reservation, when it has one. */
export function notificationHref(n: Pick<AdminNotification, "reservationId">): string | null {
  return n.reservationId ? `/reservations/${n.reservationId}` : null;
}

/** Newest first, capped to what the dropdown displays. */
export function latest(list: AdminNotification[]): AdminNotification[] {
  return [...list]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, NOTIFICATION_LIST_LIMIT);
}
