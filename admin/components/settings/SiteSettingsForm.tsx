"use client";

import { useFormIssues } from "@/components/useFormIssues";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { labelClass } from "@/components/payload/fields";
import type { AdminSiteSettings } from "@/lib/api";

const SITE_FIELDS = [
  { key: "email", label: "Email", type: "text", required: true },
  { key: "phone", label: "Téléphone", type: "text", required: true },
  { key: "whatsapp", label: "WhatsApp", type: "text", required: true },
  { key: "address", label: "Adresse", type: "text", required: true },
  { key: "latitude", label: "Latitude", type: "number" },
  { key: "longitude", label: "Longitude", type: "number" },
  { key: "instagramUrl", label: "Instagram", type: "text" },
  { key: "facebookUrl", label: "Facebook", type: "text" },
  { key: "tiktokUrl", label: "TikTok", type: "text" },
  { key: "guestsGuided", label: "Clients accompagnés", type: "text", required: true },
  { key: "yearsRunning", label: "Années d'activité", type: "text", required: true },
  { key: "googlePlaceId", label: "Place ID", type: "text" },
  { key: "manualGoogleRating", label: "Note Google", type: "text" },
  { key: "manualGoogleRatingCount", label: "Nombre d'avis Google", type: "number" },
];

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
  const fi = useFormIssues(SITE_FIELDS);
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
    manualGoogleRating: initialData?.manualGoogleRating != null ? String(initialData.manualGoogleRating) : "",
    manualGoogleRatingCount: initialData?.manualGoogleRatingCount != null ? String(initialData.manualGoogleRatingCount) : "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    fi.clear();
    const problems = [];
    for (const key of ["email", "phone", "whatsapp", "address", "guestsGuided", "yearsRunning"] as const) {
      if (!form[key].trim()) problems.push(fi.issue(key, "champ obligatoire — il est vide."));
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      problems.push(fi.issue("email", `adresse invalide (saisi : ${form.email.trim()}).`));
    }
    const lat = Number(form.latitude);
    if (form.latitude && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      problems.push(fi.issue("latitude", `doit être entre -90 et 90 (saisi : ${form.latitude}).`));
    }
    const lng = Number(form.longitude);
    if (form.longitude && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      problems.push(fi.issue("longitude", `doit être entre -180 et 180 (saisi : ${form.longitude}).`));
    }
    for (const key of ["instagramUrl", "facebookUrl", "tiktokUrl"] as const) {
      if (form[key].trim() && !/^https?:\/\//i.test(form[key].trim())) {
        problems.push(fi.issue(key, `doit commencer par http:// ou https:// (saisi : ${form[key].trim()}).`));
      }
    }
    const rating = Number(form.manualGoogleRating.replace(",", "."));
    if (form.manualGoogleRating && (!Number.isFinite(rating) || rating < 0 || rating > 5)) {
      problems.push(fi.issue("manualGoogleRating", `doit être un nombre entre 0 et 5 (saisi : ${form.manualGoogleRating}).`));
    }
    const count = Number(form.manualGoogleRatingCount);
    if (form.manualGoogleRatingCount && (!Number.isInteger(count) || count < 0)) {
      problems.push(fi.issue("manualGoogleRatingCount", `doit être un entier ≥ 0 (saisi : ${form.manualGoogleRatingCount}).`));
    }
    if (problems.length > 0) {
      toast.error(fi.local(problems));
      return;
    }
    setBusy(true);

    const res = await fetch("/api/proxy/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        manualGoogleRating: form.manualGoogleRating ? Number(form.manualGoogleRating.replace(",", ".")) : null,
        manualGoogleRatingCount: form.manualGoogleRatingCount ? Number(form.manualGoogleRatingCount) : null,
      }),
    });

    setBusy(false);
    if (!res.ok) {
      const message = await fi.fromResponse(res, "Enregistrement des coordonnées refusé");
      setError(message);
      toast.error(message);
      return;
    }
    setSaved(true);
    toast.success("Coordonnées enregistrées");
    router.refresh();
  }

  return (
    <form onSubmit={onSave} noValidate className="card flex max-w-2xl flex-col gap-5 rounded-2xl p-6">
      <div>
        <h2 className="text-[15px] font-bold text-navy-800">Coordonnées & réseaux sociaux</h2>
        <p className="mt-1 text-[13px] text-navy-700/55">
          Téléphone, email, WhatsApp, adresse et chiffres affichés sur le site public.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" type="email" required className={fi.inputClass("email")}
            value={form.email} onChange={(e) => set("email", e.target.value)} />
          {fi.errs("email")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className={labelClass}>Téléphone</label>
          <input id="phone" type="text" required className={fi.inputClass("phone")}
            value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          {fi.errs("phone")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="whatsapp" className={labelClass}>WhatsApp</label>
          <input id="whatsapp" type="text" required className={fi.inputClass("whatsapp")}
            value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          {fi.errs("whatsapp")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="address" className={labelClass}>Adresse</label>
          <input id="address" type="text" required className={fi.inputClass("address")}
            value={form.address} onChange={(e) => set("address", e.target.value)} />
          {fi.errs("address")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="latitude" className={labelClass}>Latitude</label>
          <input id="latitude" type="number" step="any" className={fi.inputClass("latitude")}
            value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
          {fi.errs("latitude")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="longitude" className={labelClass}>Longitude</label>
          <input id="longitude" type="number" step="any" className={fi.inputClass("longitude")}
            value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
          {fi.errs("longitude")}
        </div>
      </div>

      <div className="border-t border-navy-700/8 pt-4">
        <p className={labelClass}>Réseaux sociaux (laisser vide si absent)</p>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="instagramUrl" className="text-[12px] text-navy-700/50">Instagram</label>
            <input id="instagramUrl" type="url" className={fi.inputClass("instagramUrl")}
              value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} />
          {fi.errs("instagramUrl")}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="facebookUrl" className="text-[12px] text-navy-700/50">Facebook</label>
            <input id="facebookUrl" type="url" className={fi.inputClass("facebookUrl")}
              value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} />
          {fi.errs("facebookUrl")}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tiktokUrl" className="text-[12px] text-navy-700/50">TikTok</label>
            <input id="tiktokUrl" type="url" className={fi.inputClass("tiktokUrl")}
              value={form.tiktokUrl} onChange={(e) => set("tiktokUrl", e.target.value)} />
          {fi.errs("tiktokUrl")}
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
            <input id="guestsGuided" type="text" required className={fi.inputClass("guestsGuided")}
              value={form.guestsGuided} onChange={(e) => set("guestsGuided", e.target.value)} />
          {fi.errs("guestsGuided")}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="yearsRunning" className="text-[12px] text-navy-700/50">
              Années d&apos;activité (ex: &quot;8 yrs&quot;)
            </label>
            <input id="yearsRunning" type="text" required className={fi.inputClass("yearsRunning")}
              value={form.yearsRunning} onChange={(e) => set("yearsRunning", e.target.value)} />
          {fi.errs("yearsRunning")}
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
          <input id="googlePlaceId" type="text" placeholder="ChIJ..." className={fi.inputClass("googlePlaceId")}
            value={form.googlePlaceId} onChange={(e) => set("googlePlaceId", e.target.value)} />
          {fi.errs("googlePlaceId")}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="manualGoogleRating" className="text-[12px] text-navy-700/50">Note Google (saisie manuelle, ex. 4,8)</label>
            <input id="manualGoogleRating" type="text" inputMode="decimal" placeholder="4,8" className={fi.inputClass("manualGoogleRating")}
              value={form.manualGoogleRating} onChange={(e) => set("manualGoogleRating", e.target.value)} />
          {fi.errs("manualGoogleRating")}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="manualGoogleRatingCount" className="text-[12px] text-navy-700/50">Nombre d&apos;avis Google</label>
            <input id="manualGoogleRatingCount" type="number" min={0} placeholder="496" className={fi.inputClass("manualGoogleRatingCount")}
              value={form.manualGoogleRatingCount} onChange={(e) => set("manualGoogleRatingCount", e.target.value)} />
          {fi.errs("manualGoogleRatingCount")}
          </div>
        </div>
        <p className="mt-2 text-[12px] text-navy-700/50">
          À recopier depuis votre fiche Google. Utilisée seulement tant que la récupération automatique n&apos;a rien renvoyé ; laissez vide pour ne rien afficher.
        </p>
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
      {fi.issues.length > 0 ? fi.panel() : error && (
        <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
          {error}
        </div>
      )}
    </form>
  );
}
