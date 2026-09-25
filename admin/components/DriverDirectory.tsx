"use client";

import { readApiError } from "@/lib/apiError";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminDriverProfile } from "@/lib/api";

export default function DriverDirectory({ initialDrivers }: { initialDrivers: AdminDriverProfile[] }) {
  const toast = useToast();
  const [drivers, setDrivers] = useState(initialDrivers);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phoneNumber: "", vehicleModel: "", numberOfSeats: "",
  });

  function field(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createDriver(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/proxy/driver-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        phoneNumber: form.phoneNumber || null,
        vehicleModel: form.vehicleModel || null,
        numberOfSeats: form.numberOfSeats ? Number(form.numberOfSeats) : null,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error(await readApiError(response, "Impossible de créer le chauffeur"));
      return;
    }
    const created = (await response.json()) as AdminDriverProfile;
    setDrivers((current) => [created, ...current]);
    setForm({ firstName: "", lastName: "", email: "", phoneNumber: "", vehicleModel: "", numberOfSeats: "" });
    toast.success("Chauffeur créé — l’invitation a été envoyée par email");
  }

  async function setActive(driver: AdminDriverProfile, active: boolean) {
    setBusy(true);
    const response = await fetch(`/api/proxy/driver-profiles/${driver.driverProfileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error(await readApiError(response, "Impossible de modifier le chauffeur"));
      return;
    }
    const updated = (await response.json()) as AdminDriverProfile;
    setDrivers((current) => current.map((item) => item.driverProfileId === updated.driverProfileId ? updated : item));
    toast.success(active ? "Chauffeur réactivé" : "Chauffeur désactivé");
  }

  async function resendInvitation(driver: AdminDriverProfile) {
    setBusy(true);
    const response = await fetch(`/api/proxy/driver-profiles/${driver.driverProfileId}/invitation`, { method: "POST" });
    setBusy(false);
    if (!response.ok) {
      toast.error(await readApiError(response, "Impossible d’envoyer une nouvelle invitation"));
      return;
    }
    toast.success("Nouvelle invitation envoyée");
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={createDriver} className="card rounded-2xl p-5">
        <h2 className="text-sm font-bold text-navy-800">Ajouter un chauffeur</h2>
        <p className="mt-1 text-xs text-navy-700/50">
          Le chauffeur recevra un lien sécurisé valable 24 h pour choisir lui-même son mot de passe.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Prénom" required value={form.firstName} onChange={(value) => field("firstName", value)} />
          <Input label="Nom" required value={form.lastName} onChange={(value) => field("lastName", value)} />
          <Input label="Email" type="email" required value={form.email} onChange={(value) => field("email", value)} />
          <Input label="Téléphone" value={form.phoneNumber} onChange={(value) => field("phoneNumber", value)} />
          <Input label="Véhicule" value={form.vehicleModel} onChange={(value) => field("vehicleModel", value)} />
          <Input label="Nombre de places" type="number" min="1" value={form.numberOfSeats} onChange={(value) => field("numberOfSeats", value)} />
        </div>
        <button className="btn btn-primary mt-4" type="submit" disabled={busy}>
          {busy ? "Création…" : "Créer et envoyer l’invitation"}
        </button>
      </form>

      <div className="card overflow-hidden rounded-2xl">
        {drivers.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Aucun chauffeur dans l’annuaire.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-medium">Chauffeur</th><th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Véhicule</th><th className="px-6 py-3 font-medium">Statut</th><th className="px-6 py-3" />
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.map((driver) => (
                  <tr key={driver.driverProfileId} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{driver.firstName} {driver.lastName}</td>
                    <td className="px-6 py-3 text-gray-600"><div>{driver.email}</div><div>{driver.phoneNumber ?? "—"}</div></td>
                    <td className="px-6 py-3 text-gray-600">{driver.vehicleModel ?? "—"}{driver.numberOfSeats ? ` · ${driver.numberOfSeats} places` : ""}</td>
                    <td className="px-6 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${driver.active ? "bg-emerald/10 text-emerald" : "bg-gray-100 text-gray-500"}`}>{driver.active ? "Actif" : "Inactif"}</span></td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        {driver.active && <button type="button" disabled={busy} className="text-xs font-semibold text-navy-700 hover:underline disabled:opacity-40" onClick={() => resendInvitation(driver)}>Renvoyer l’invitation</button>}
                        <button type="button" disabled={busy} className="text-xs font-semibold text-navy-700 hover:underline disabled:opacity-40" onClick={() => setActive(driver, !driver.active)}>{driver.active ? "Désactiver" : "Réactiver"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, onChange, ...props }: { label: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return <label className="flex flex-col gap-1"><span className={labelClass}>{label}</span><input {...props} className={inputClass} onChange={(event) => onChange(event.target.value)} /></label>;
}
