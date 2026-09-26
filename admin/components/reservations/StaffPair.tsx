import type { AdminReservation, AdminReservationStaffMember } from "@/lib/api";

/** Who needs a guide and a chauffeur: every circuit, and a stay only when the guest asked for transportation. */
export function needsStaff(r: Pick<AdminReservation, "reservationType" | "arrivalMode">): boolean {
  return r.reservationType === "TOURS" || (r.reservationType === "HEBERGEMENT" && r.arrivalMode === "TRANSPORT");
}

/** The guide and the chauffeur of a reservation, side by side: assigned, still to assign, or not concerned. */
export function StaffPair({ r }: { r: Pick<AdminReservation, "reservationType" | "arrivalMode" | "guides" | "chauffeurs"> }) {
  const applicable = needsStaff(r);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Staff
        title="Guide"
        people={r.guides ?? []}
        applicable={applicable}
        empty={applicable ? "Aucun guide affecté" : "Non concerné (véhicule perso)"}
        detail={(g) => (g.languages?.length ? g.languages.map((l) => l.name).join(", ") : null)}
      />
      <Staff
        title="Chauffeur"
        people={r.chauffeurs ?? []}
        applicable={applicable}
        empty={applicable ? "Aucun chauffeur affecté" : "Non concerné (véhicule perso)"}
        detail={(c) => [c.vehicleModel, c.numberOfSeats ? `${c.numberOfSeats} places` : null].filter(Boolean).join(" · ") || null}
      />
    </div>
  );
}

function Staff({
  title,
  people,
  applicable,
  empty,
  detail,
}: {
  title: string;
  people: AdminReservationStaffMember[];
  applicable: boolean;
  empty: string;
  detail: (p: AdminReservationStaffMember) => string | null;
}) {
  if (people.length === 0) {
    return (
      <div className={`rounded-lg px-3 py-2 text-[13px] ${applicable ? "bg-amber-50 text-amber-800" : "bg-gray-50 text-gray-500"}`}>
        <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{title}</div>
        {empty}
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{title}</div>
      {people.map((p) => (
        <div key={p.guideId ?? p.chauffeurId ?? `${p.firstName}${p.lastName}`}>
          <span className="font-medium">
            {p.firstName} {p.lastName}
          </span>
          {p.phoneNumber && <span className="text-emerald-900/70"> · {p.phoneNumber}</span>}
          {detail(p) && <div className="text-[12px] text-emerald-900/70">{detail(p)}</div>}
        </div>
      ))}
    </div>
  );
}
