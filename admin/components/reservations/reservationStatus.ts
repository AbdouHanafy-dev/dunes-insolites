export const RESERVATION_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmée", className: "bg-emerald-100 text-emerald-800" },
  CHECKED_IN: { label: "Arrivée", className: "bg-sky-100 text-sky-800" },
  COMPLETED: { label: "Terminée", className: "bg-slate-200 text-slate-700" },
  CANCELLED: { label: "Annulée", className: "bg-rose-100 text-rose-800" },
  REJECTED: { label: "Refusée", className: "bg-orange-100 text-orange-800" },
  EXPIRED: { label: "Expirée", className: "bg-stone-200 text-stone-600" },
};

export function statusOf(status: string) {
  return RESERVATION_STATUS[status] ?? { label: status.toLowerCase(), className: "bg-gray-100 text-gray-700" };
}

/** Statuses the backend lets staff edit (PENDING / CONFIRMED); every other status is read-only. */
export const isEditable = (status: string) => status === "PENDING" || status === "CONFIRMED";
