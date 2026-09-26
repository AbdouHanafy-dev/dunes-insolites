"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { readApiError } from "@/lib/apiError";
import Modal from "@/components/Modal";
import TableFilters from "@/components/TableFilters";
import { useTableFilters } from "@/components/useTableFilters";
import { useToast } from "@/components/Toast";
import { labelClass } from "@/components/payload/fields";
import { CARD_GRID } from "@/components/PersonCard";
import { parsePercent, percentLabel, promoTotals, validityOf, type AdminPromoCode } from "@/lib/promoCodes";

const control =
  "w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none focus:border-gold/60";

const money = (value: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value)} €`;

type Draft = {
  code: string;
  partnerName: string;
  discountPercent: string;
  commissionPercent: string;
  validFrom: string;
  validUntil: string;
  active: boolean;
};

const EMPTY: Draft = { code: "", partnerName: "", discountPercent: "", commissionPercent: "", validFrom: "", validUntil: "", active: true };

const draftOf = (c: AdminPromoCode): Draft => ({
  code: c.code,
  partnerName: c.partnerName,
  discountPercent: String(c.discountPercent),
  commissionPercent: c.commissionPercent == null ? "" : String(c.commissionPercent),
  validFrom: c.validFrom ?? "",
  validUntil: c.validUntil ?? "",
  active: c.active,
});

/**
 * The partner promo codes: one card per code with what it brought in and the commission owed to the
 * hotel. Only confirmed, checked-in and completed reservations are counted; pending ones are shown apart.
 */
export default function PromoCodesManager({ initialItems }: { initialItems: AdminPromoCode[] }) {
  const router = useRouter();
  const toast = useToast();
  const today = new Date().toLocaleDateString("en-CA");
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [deleting, setDeleting] = useState<AdminPromoCode | null>(null);
  const [busy, setBusy] = useState(false);

  const { filtered, bar } = useTableFilters(
    initialItems,
    [
      {
        id: "state", label: "Statut", kind: "select",
        options: [{ value: "live", label: "Actif" }, { value: "soon", label: "À venir" }, { value: "over", label: "Expiré" }, { value: "off", label: "Désactivé" }],
        get: (c) => validityOf(c, today).key,
      },
    ],
    (c) => [c.code, c.partnerName],
  );
  const totals = promoTotals(initialItems);

  async function save() {
    if (!editing) return;
    const { id, draft } = editing;
    const discount = parsePercent(draft.discountPercent);
    if (!draft.code.trim() || !draft.partnerName.trim()) {
      toast.error("Le code et l’hôtel partenaire sont obligatoires.");
      return;
    }
    if (discount == null || discount <= 0 || discount > 100) {
      toast.error("La remise doit être un pourcentage entre 0 et 100.");
      return;
    }
    const commission = draft.commissionPercent.trim() === "" ? null : parsePercent(draft.commissionPercent);
    if (draft.commissionPercent.trim() !== "" && (commission == null || commission < 0 || commission > 100)) {
      toast.error("La commission doit être un pourcentage entre 0 et 100.");
      return;
    }
    setBusy(true);
    const res = await fetch(id ? `/api/proxy/admin/promo-codes/${id}` : "/api/proxy/admin/promo-codes", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: draft.code.trim(),
        partnerName: draft.partnerName.trim(),
        discountPercent: discount,
        commissionPercent: commission,
        validFrom: draft.validFrom || null,
        validUntil: draft.validUntil || null,
        active: draft.active,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(await readApiError(res, "Enregistrement du code refusé"));
      return;
    }
    toast.success(id ? "Code mis à jour" : "Code créé");
    setEditing(null);
    router.refresh();
  }

  async function toggle(c: AdminPromoCode) {
    setBusy(true);
    const res = await fetch(`/api/proxy/admin/promo-codes/${c.promoCodeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: c.code, partnerName: c.partnerName, discountPercent: c.discountPercent, commissionPercent: c.commissionPercent,
        validFrom: c.validFrom, validUntil: c.validUntil, active: !c.active,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(await readApiError(res, "Mise à jour refusée"));
      return;
    }
    toast.success(c.active ? "Code désactivé" : "Code réactivé");
    router.refresh();
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/admin/promo-codes/${deleting.promoCodeId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error(await readApiError(res, "Suppression impossible"));
      return;
    }
    toast.success("Code supprimé");
    setDeleting(null);
    router.refresh();
  }

  const set = (patch: Partial<Draft>) => setEditing((cur) => (cur ? { ...cur, draft: { ...cur.draft, ...patch } } : cur));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Codes promo hôtels</h1>
          <p className="mt-1 text-sm text-navy-700/55">
            Un code par hôtel partenaire : il donne une remise sur le prix du circuit, et l’hôtel touche une commission sur les
            circuits confirmés ou terminés.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ id: null, draft: EMPTY })}>
          + Nouveau code
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Réservations avec un code" value={String(totals.reservations)} hint={totals.pending > 0 ? `+ ${totals.pending} en attente` : undefined} />
        <Stat label="Chiffre d’affaires circuits" value={money(totals.revenue)} />
        <Stat label="Remises accordées" value={money(totals.discount)} />
        <Stat
          label="Commissions à payer"
          value={money(totals.commission)}
          hint={totals.withoutRate > 0 ? `${totals.withoutRate} code(s) sans taux de commission` : undefined}
          strong
        />
      </div>

      <div className="card overflow-hidden rounded-2xl">
        <TableFilters {...bar} placeholder="Code ou hôtel…" />
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">
            {initialItems.length === 0 ? "Aucun code promo pour le moment." : "Aucun code ne correspond."}
          </p>
        ) : (
          <div className={CARD_GRID}>
            {filtered.map((c) => {
              const state = validityOf(c, today);
              return (
                <article key={c.promoCodeId} className="card flex flex-col gap-3 rounded-2xl p-4">
                  <header className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-[16px] font-bold text-navy-800">{c.partnerName}</h3>
                      <p className="mt-0.5 inline-block rounded-md bg-navy-800 px-2 py-0.5 font-mono text-[13px] font-semibold tracking-wide text-white">
                        {c.code}
                      </p>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                        state.key === "live" ? "bg-emerald-100 text-emerald-800" : state.key === "soon" ? "bg-sky-100 text-sky-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {state.label}
                    </span>
                  </header>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                    <Fact label="Remise client" value={percentLabel(c.discountPercent)} />
                    <Fact label="Commission hôtel" value={c.commissionPercent == null ? "à définir" : percentLabel(c.commissionPercent)} warn={c.commissionPercent == null} />
                  </dl>

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-navy-700/[0.04] p-3">
                    <Big label="Réservations" value={String(c.reservations)} hint={c.pendingReservations > 0 ? `+ ${c.pendingReservations} en attente` : undefined} />
                    <Big label="Commission à payer" value={c.commissionDue == null ? "—" : money(c.commissionDue)} />
                    <Small label="CA circuits" value={money(c.circuitRevenue)} />
                    <Small label="Remises accordées" value={money(c.discountGiven)} />
                  </div>

                  <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-navy-700/8 pt-3 text-xs font-semibold">
                    <Link href={`/reservations/circuits?q=${encodeURIComponent(c.code)}`} className="text-navy-800 hover:underline">
                      Voir les réservations →
                    </Link>
                    <span className="flex gap-3">
                      <button type="button" className="text-navy-700 hover:underline" onClick={() => setEditing({ id: c.promoCodeId, draft: draftOf(c) })}>Modifier</button>
                      <button type="button" disabled={busy} className="text-navy-700 hover:underline disabled:opacity-40" onClick={() => toggle(c)}>{c.active ? "Désactiver" : "Réactiver"}</button>
                      <button type="button" className="text-rose hover:underline" onClick={() => setDeleting(c)}>Supprimer</button>
                    </span>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? "Modifier le code promo" : "Nouveau code promo"} onClose={() => (busy ? undefined : setEditing(null))}>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Hôtel partenaire</span>
              <input className={control} value={editing.draft.partnerName} maxLength={120} placeholder="Ex. Hôtel Badira" onChange={(e) => set({ partnerName: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Code</span>
              <input
                className={`${control} font-mono uppercase`}
                value={editing.draft.code}
                maxLength={40}
                placeholder="BADIRA10"
                onChange={(e) => set({ code: e.target.value.toUpperCase() })}
              />
              <span className="text-[12px] text-navy-700/50">Lettres, chiffres, - ou _. Le client peut l’écrire en majuscules ou en minuscules.</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Remise client (%)</span>
                <input className={control} inputMode="decimal" value={editing.draft.discountPercent} placeholder="10" onChange={(e) => set({ discountPercent: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Commission hôtel (%)</span>
                <input className={control} inputMode="decimal" value={editing.draft.commissionPercent} placeholder="à définir" onChange={(e) => set({ commissionPercent: e.target.value })} />
              </label>
            </div>
            <p className="-mt-1 text-[12px] text-navy-700/50">
              La remise s’applique au prix du circuit seulement (pas aux options ni aux activités). La commission se calcule sur ce prix
              après remise ; laissez-la vide tant qu’elle n’est pas fixée.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Valable à partir du</span>
                <input type="date" className={control} value={editing.draft.validFrom} onChange={(e) => set({ validFrom: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Jusqu’au</span>
                <input type="date" className={control} value={editing.draft.validUntil} onChange={(e) => set({ validUntil: e.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-navy-800">
              <input type="checkbox" checked={editing.draft.active} onChange={(e) => set({ active: e.target.checked })} />
              Code actif
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setEditing(null)}>Annuler</button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Supprimer le code promo" onClose={() => (busy ? undefined : setDeleting(null))}>
          <p className="text-sm text-navy-700/80">
            Supprimer le code <strong>{deleting.code}</strong> ({deleting.partnerName}) ? Un code qui a déjà des réservations ne peut pas être
            supprimé : désactivez-le.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setDeleting(null)}>Annuler</button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>{busy ? "Suppression…" : "Supprimer"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={`card rounded-2xl p-4 ${strong ? "border-gold/40" : ""}`}>
      <div className="text-[11px] uppercase tracking-wide text-navy-700/50">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-navy-800">{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-amber-700">{hint}</div>}
    </div>
  );
}

function Fact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-navy-700/45">{label}</dt>
      <dd className={`font-medium ${warn ? "text-amber-700" : "text-navy-800"}`}>{value}</dd>
    </div>
  );
}

function Big({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-navy-700/50">{label}</div>
      <div className="text-[22px] font-bold tabular-nums leading-tight text-navy-800">{value}</div>
      {hint && <div className="text-[11px] text-amber-700">{hint}</div>}
    </div>
  );
}

function Small({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-navy-700/45">{label}</div>
      <div className="text-[13px] font-medium tabular-nums text-navy-800">{value}</div>
    </div>
  );
}
