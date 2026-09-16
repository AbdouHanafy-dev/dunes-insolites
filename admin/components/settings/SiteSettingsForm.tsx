"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import type { AdminSiteSettings } from "@/lib/api";

/**
 * On request, 15 Sep 2026 — the business facts the vitrine used to
 * hardcode in frontend/lib/site.ts and lib/data/stats.ts (phone, email,
 * WhatsApp, address, coordinates, social links, headline stats), now
 * editable here instead of needing a code deploy. The public site's
 * Header/Footer/WhatsApp button/JSON-LD/contact page all actually read
 * these values now (frontend/lib/api.ts's getSiteSettings) — this isn't
 * just storage, editing here changes what a visitor sees.
 */
export default function SiteSettingsForm({ initialData }: { initialData: AdminSiteSettings | null }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    whatsapp: initialData?.whatsapp ?? "",
    address: initialData?.address ?? "",
    latitude: initialData?.latitude != null ? String(initialData.latitude) : "",
    longitude: initialData?.longitude != null ? String(initialData.longitude) : "",
    instagramUrl: initialData?.instagramUrl ?? "",
    facebookUrl: initialData?.facebookUrl ?? "",
    tiktokUrl: initialData?.tiktokUrl ?? "",
    guestsGuided: initialData?.guestsGuided ?? "",
    yearsRunning: initialData?.yearsRunning ?? "",
    googlePlaceId: initialData?.googlePlaceId ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/proxy/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      }),
    });

    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.message ?? data.error ?? "Une erreur est survenue.";
      setError(message);
      toast.error(message);
      return;
    }
    setSaved(true);
    toast.success("Coordonnées enregistrées");
    router.refresh();
  }

  return (
    <form onSubmit={onSave} className="card flex max-w-2xl flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="text-[15px] font-bold text-navy-800">Coordonnées & réseaux sociaux</h2>
        <p className="mt-1 text-[13px] text-navy-700/55">
          Téléphone, email, WhatsApp, adresse et chiffres affichés sur le site public.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" type="email" required className={inputClass}
            value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className={labelClass}>Téléphone</label>
          <input id="phone" type="text" required className={inputClass}
            value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="whatsapp" className={labelClass}>WhatsApp</label>
          <input id="whatsapp" type="text" required className={inputClass}
            value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="address" className={labelClass}>Adresse</label>
          <input id="address" type="text" required className={inputClass}
            value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="latitude" className={labelClass}>Latitude</label>
          <input id="latitude" type="number" step="any" className={inputClass}
            value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="longitude" className={labelClass}>Longitude</label>
          <input id="longitude" type="number" step="any" className={inputClass}
            value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
        </div>
      </div>

      <div className="border-t border-navy-700/8 pt-4">
        <p className={labelClass}>Réseaux sociaux (laisser vide si absent)</p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="instagramUrl" className="text-[12px] text-navy-700/50">Instagram</label>
            <input id="instagramUrl" type="url" className={inputClass}
              value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="facebookUrl" className="text-[12px] text-navy-700/50">Facebook</label>
            <input id="facebookUrl" type="url" className={inputClass}
              value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tiktokUrl" className="text-[12px] text-navy-700/50">TikTok</label>
            <input id="tiktokUrl" type="url" className={inputClass}
              value={form.tiktokUrl} onChange={(e) => set("tiktokUrl", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="border-t border-navy-700/8 pt-4">
        <p className={labelClass}>Chiffres affichés sur la page d&apos;accueil</p>
        <p className="mt-1 text-[12px] text-navy-700/45">
          Des faits réels de l&apos;entreprise (nombre total de clients, années d&apos;activité) — jamais
          calculés automatiquement, à mettre à jour vous-même quand ils changent.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="guestsGuided" className="text-[12px] text-navy-700/50">
              Clients accompagnés (ex: &quot;12k+&quot;)
            </label>
            <input id="guestsGuided" type="text" required className={inputClass}
              value={form.guestsGuided} onChange={(e) => set("guestsGuided", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="yearsRunning" className="text-[12px] text-navy-700/50">
              Années d&apos;activité (ex: &quot;8 yrs&quot;)
            </label>
            <input id="yearsRunning" type="text" required className={inputClass}
              value={form.yearsRunning} onChange={(e) => set("yearsRunning", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="border-t border-navy-700/8 pt-4">
        <p className={labelClass}>Note Google (avis réels, jamais inventée)</p>
        <p className="mt-1 text-[12px] text-navy-700/45">
          La note affichée sur le site vient directement de votre fiche Google Business — pas d&apos;une
          moyenne calculée en interne. Trouvez le Place ID via{" "}
          <a
            href="https://developers.google.com/maps/documentation/places/web-service/place-id#find-id"
            target="_blank"
            rel="noreferrer noopener"
            className="text-gold-dark underline"
          >
            l&apos;outil officiel Google
          </a>.
        </p>
        <div className="mt-2 flex flex-col gap-1.5">
          <label htmlFor="googlePlaceId" className="text-[12px] text-navy-700/50">Place ID</label>
          <input id="googlePlaceId" type="text" placeholder="ChIJ..." className={inputClass}
            value={form.googlePlaceId} onChange={(e) => set("googlePlaceId", e.target.value)} />
        </div>
        <p className="mt-2 text-[13px] text-navy-700/60">
          {initialData?.googleRating != null ? (
            <>
              Note actuellement affichée : <strong>{initialData.googleRating.toFixed(1)}★</strong>
              {initialData.googleRatingCount != null && ` (${initialData.googleRatingCount} avis)`}
            </>
          ) : initialData?.googlePlaceId ? (
            "Place ID enregistré, en attente de la première récupération réussie (vérifiez que GOOGLE_PLACES_API_KEY est configurée côté serveur)."
          ) : (
            "Aucun Place ID configuré — le site affiche la moyenne des avis internes en attendant."
          )}
        </p>
      </div>

      {initialData?.updatedAt && (
        <p className="text-[12px] text-navy-700/40">
          Dernière modification : {new Date(initialData.updatedAt).toLocaleString("fr-FR")}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn btn-primary btn-block">
        {busy ? "Enregistrement…" : "Enregistrer"}
      </button>

      {saved && (
        <div className="rounded-[10px] border border-emerald/25 bg-emerald/8 px-3 py-2.5 text-[13px] text-emerald">
          Coordonnées enregistrées.
        </div>
      )}
      {error && (
        <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
          {error}
        </div>
      )}
    </form>
  );
}
