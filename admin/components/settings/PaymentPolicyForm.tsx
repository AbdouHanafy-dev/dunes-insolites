"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminPaymentPolicy } from "@/lib/api";

/**
 * The payment rules the "Envoyer la demande de paiement" email is built from
 * (PaymentPolicyController). Changing a rule here changes what clients are
 * asked from the next email on - nothing is hardcoded in the backend any more.
 * Payment status on a reservation stays derived from the payments actually
 * recorded, whatever the rule says.
 */
const MODES: { value: AdminPaymentPolicy["depositMode"]; label: string; hint: string }[] = [
  { value: "PERCENT", label: "Acompte en pourcentage", hint: "Un pourcentage du total avant l'arrivée, le solde sur place." },
  { value: "FULL", label: "Paiement intégral", hint: "La totalité du séjour avant l'arrivée." },
  { value: "NONE", label: "Aucun acompte", hint: "Tout se règle à l'arrivée." },
];

const METHODS: { key: keyof Pick<AdminPaymentPolicy, "acceptOnlineLink" | "acceptBankTransfer" | "acceptCardOnSite" | "acceptCashOnSite" | "acceptCheque">; label: string }[] = [
  { key: "acceptOnlineLink", label: "Lien de paiement en ligne" },
  { key: "acceptBankTransfer", label: "Virement bancaire" },
  { key: "acceptCardOnSite", label: "Carte bancaire (TPE) sur place" },
  { key: "acceptCashOnSite", label: "Espèces sur place" },
  { key: "acceptCheque", label: "Chèque" },
];

export default function PaymentPolicyForm({ initialData }: { initialData: AdminPaymentPolicy | null }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<AdminPaymentPolicy>(
    initialData ?? {
      depositMode: "PERCENT",
      depositPercent: 10,
      deadlineDaysBefore: null,
      acceptOnlineLink: true,
      acceptBankTransfer: true,
      acceptCardOnSite: true,
      acceptCashOnSite: true,
      acceptCheque: false,
      note: null,
    },
  );
  const [busy, setBusy] = useState(false);

  function patch(p: Partial<AdminPaymentPolicy>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/proxy/payment-policy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message ?? "Enregistrement impossible.");
      return;
    }
    toast.success("Règles de paiement enregistrées");
    router.refresh();
  }

  const needsAmount = form.depositMode !== "NONE";

  return (
    <form onSubmit={onSave} className="card flex max-w-2xl flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="text-[15px] font-bold text-navy-800">Règles de paiement</h2>
        <p className="mt-1 text-[13px] text-navy-700/55">
          Ce que l&apos;email « demande de paiement » réclame au client, et les moyens de paiement qu&apos;il indique.
        </p>
      </div>

      {!initialData && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          Règles actuelles indisponibles — vérifiez que le backend est accessible avant d&apos;enregistrer.
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>Acompte</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <label
              key={m.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition ${
                form.depositMode === m.value ? "border-gold bg-gold/10" : "border-navy-700/15 hover:border-navy-700/30"
              }`}
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold text-navy-800">
                <input
                  type="radio"
                  name="depositMode"
                  checked={form.depositMode === m.value}
                  onChange={() => patch({ depositMode: m.value })}
                />
                {m.label}
              </span>
              <span className="text-[12px] text-navy-700/55">{m.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {needsAmount && (
        <div className="grid gap-4 sm:grid-cols-2">
          {form.depositMode === "PERCENT" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pct" className={labelClass}>Pourcentage du total (%)</label>
              <input
                id="pct"
                type="number"
                min={0}
                max={100}
                step="0.01"
                className={inputClass}
                value={form.depositPercent}
                onChange={(e) => patch({ depositPercent: Number(e.target.value) })}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="days" className={labelClass}>À régler ... jours avant l&apos;arrivée</label>
            <input
              id="days"
              type="number"
              min={0}
              placeholder="vide = le jour de l'arrivée"
              className={inputClass}
              value={form.deadlineDaysBefore ?? ""}
              onChange={(e) => patch({ deadlineDaysBefore: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      <fieldset className="flex flex-col gap-2 border-t border-navy-700/8 pt-4">
        <legend className={labelClass}>Moyens de paiement acceptés</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {METHODS.map((m) => (
            <label key={m.key} className="flex cursor-pointer items-center gap-2 text-[14px] text-navy-800">
              <input type="checkbox" checked={form[m.key]} onChange={(e) => patch({ [m.key]: e.target.checked })} />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className={labelClass}>Message ajouté à l&apos;email (IBAN, consignes…)</label>
        <textarea
          id="note"
          rows={3}
          maxLength={1000}
          className={inputClass}
          value={form.note ?? ""}
          onChange={(e) => patch({ note: e.target.value })}
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
