"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormIssues } from "@/components/useFormIssues";
import { useToast } from "@/components/Toast";
import { labelClass } from "@/components/payload/fields";
import { formatRate, parseAmount, perEuro, type AdminCurrencyRates } from "@/lib/currencyRates";

const FIELDS = [
  { key: "eurAmount", label: "Euros", type: "number" },
  { key: "usdAmount", label: "Dollars", type: "number" },
  { key: "tndAmount", label: "Dinars", type: "number" },
];

/**
 * The exchange rates, said the way one says them: "10 € = 12 $ = 30 TND". The site shows every
 * price in euros, dollars or dinars from these; bookings, payments and invoices are converted with
 * the same rates. Changing them applies at once on the server and reaches the public site within
 * a few minutes.
 */
export default function CurrencyRatesForm({ initialData }: { initialData: AdminCurrencyRates | null }) {
  const router = useRouter();
  const toast = useToast();
  const fi = useFormIssues(FIELDS);
  const [eur, setEur] = useState(String(initialData?.eurAmount ?? 10));
  const [usd, setUsd] = useState(String(initialData?.usdAmount ?? 13.6));
  const [tnd, setTnd] = useState(String(initialData?.tndAmount ?? 34));
  const [busy, setBusy] = useState(false);

  const eurN = parseAmount(eur);
  const usdN = parseAmount(usd);
  const tndN = parseAmount(tnd);
  const per = perEuro(eurN, usdN, tndN);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    fi.clear();
    const problems = [];
    if (eurN == null) problems.push(fi.issue("eurAmount", `doit être un nombre supérieur à 0 (saisi : ${eur.trim() || "vide"}).`));
    if (usdN == null) problems.push(fi.issue("usdAmount", `doit être un nombre supérieur à 0 (saisi : ${usd.trim() || "vide"}).`));
    if (tndN == null) problems.push(fi.issue("tndAmount", `doit être un nombre supérieur à 0 (saisi : ${tnd.trim() || "vide"}).`));
    if (problems.length > 0) {
      toast.error(fi.local(problems));
      return;
    }
    setBusy(true);
    const res = await fetch("/api/proxy/admin/currency-rates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eurAmount: eurN, usdAmount: usdN, tndAmount: tndN }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(await fi.fromResponse(res, "Enregistrement des taux de change refusé"));
      return;
    }
    toast.success("Taux de change enregistrés");
    router.refresh();
  }

  const box =
    "w-full rounded-[9px] border border-navy-700/15 bg-white px-3.5 py-2.5 text-[14px] text-navy-800 outline-none transition focus:border-gold/60 focus:ring-3 focus:ring-gold/15";

  return (
    <form onSubmit={onSave} noValidate className="card flex max-w-2xl flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="text-[15px] font-bold text-navy-800">Taux de change</h2>
        <p className="mt-1 text-[13px] text-navy-700/55">
          Saisissez trois montants qui valent la même chose, par exemple 10 € = 12 $ = 30 dinars. Le site s&apos;en sert pour
          afficher chaque prix en euros, en dollars ou en dinars ; la conversion est automatique sur tous les prix.
          Les réservations restent enregistrées en euros.
        </p>
      </div>

      {!initialData && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          Taux actuels indisponibles — vérifiez que le backend est accessible avant d&apos;enregistrer.
        </p>
      )}

      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rate-eur" className={labelClass}>Euros (€)</label>
          <input id="rate-eur" inputMode="decimal" className={fi.inputClass("eurAmount") ?? box} value={eur} onChange={(e) => setEur(e.target.value)} />
          {fi.errs("eurAmount")}
        </div>
        <span className="pb-3 text-center text-lg font-bold text-navy-700/50" aria-hidden>=</span>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rate-usd" className={labelClass}>Dollars ($)</label>
          <input id="rate-usd" inputMode="decimal" className={fi.inputClass("usdAmount") ?? box} value={usd} onChange={(e) => setUsd(e.target.value)} />
          {fi.errs("usdAmount")}
        </div>
        <span className="pb-3 text-center text-lg font-bold text-navy-700/50" aria-hidden>=</span>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rate-tnd" className={labelClass}>Dinars (TND)</label>
          <input id="rate-tnd" inputMode="decimal" className={fi.inputClass("tndAmount") ?? box} value={tnd} onChange={(e) => setTnd(e.target.value)} />
          {fi.errs("tndAmount")}
        </div>
      </div>

      <div className="rounded-lg bg-navy-700/[0.04] px-4 py-3 text-[13px] text-navy-700/80" aria-live="polite">
        {per ? (
          <>
            <div>
              <strong>1 €</strong> = {formatRate(per.usd)} $ = {formatRate(per.tnd)} TND
            </div>
            <div className="mt-1 text-navy-700/60">
              Un prix de 100 € s&apos;affichera <strong>{formatRate(per.usd * 100)} $</strong> ou <strong>{formatRate(per.tnd * 100)} TND</strong> sur le site.
            </div>
          </>
        ) : (
          <span className="text-navy-700/60">Saisissez les trois montants pour voir le résultat.</span>
        )}
      </div>

      {initialData?.updatedAt && (
        <p className="text-[12px] text-navy-700/45">Dernière modification : {new Date(initialData.updatedAt).toLocaleString("fr-FR")}</p>
      )}

      {fi.panel()}

      <div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer les taux"}
        </button>
      </div>
    </form>
  );
}
