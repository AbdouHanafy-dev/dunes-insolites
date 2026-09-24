"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SITE_IMAGE_SLOTS } from "@dunes/api-types";
import { useToast } from "@/components/Toast";
import type { AdminSiteImage } from "@/lib/api";
import MediaPicker from "@/components/MediaPicker";

/**
 * Every photo the site shows that isn't tied to a catalogue item (home,
 * page headers, "Qui sommes-nous ?", activity fallbacks). Support picks a
 * new photo per slot; "Rétablir" removes the replacement so the site's
 * built-in photo comes back. Photos of activities, stays and
 * accommodations are edited in their own Catalogue forms.
 */
export default function SiteImagesManager({ images }: { images: AdminSiteImage[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pickingKey, setPickingKey] = useState<string | null>(null);

  const byKey = new Map(images.map((i) => [i.key, i]));
  const groups = [...new Set(SITE_IMAGE_SLOTS.map((s) => s.group))];

  async function replace(key: string, url: string) {
    setPickingKey(null);
    setBusyKey(key);
    const res = await fetch(`/api/proxy/site-images/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    setBusyKey(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message ?? "Enregistrement impossible.");
      return;
    }
    toast.success("Photo remplacée");
    router.refresh();
  }

  async function reset(key: string) {
    setBusyKey(key);
    const res = await fetch(`/api/proxy/site-images/${key}`, { method: "DELETE" });
    setBusyKey(null);
    if (!res.ok) {
      toast.error("Impossible de rétablir la photo.");
      return;
    }
    toast.success("Photo par défaut rétablie");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-navy-800">Photos du site</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-navy-700/60">
          Remplacez ici les grandes photos du site. Un changement apparaît en une minute environ. Pour les photos
          d’une activité, d’un séjour ou d’un hébergement, utilisez leur fiche dans le Catalogue.
        </p>
      </div>

      {pickingKey && (
        <MediaPicker
          title="Remplacer la photo"
          onClose={() => setPickingKey(null)}
          onPick={([url]) => replace(pickingKey, url)}
        />
      )}

      {groups.map((group) => (
        <section key={group} className="card rounded-2xl p-6">
          <h2 className="mb-4 text-[15px] font-bold text-navy-800">{group}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SITE_IMAGE_SLOTS.filter((s) => s.group === group).map((slot) => {
              const current = byKey.get(slot.key);
              const busy = busyKey === slot.key;
              return (
                <li key={slot.key} className="flex flex-col gap-3 rounded-xl border border-navy-700/10 p-3">
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-navy-700/5">
                    {current ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={current.url} alt={slot.label} className="h-full w-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center px-4 text-center text-[12px] text-navy-700/45">
                        Photo par défaut du site
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-semibold text-navy-800">{slot.label}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => setPickingKey(slot.key)} className="btn btn-secondary btn-sm">
                      {busy ? "Envoi…" : current ? "Changer" : "+ Choisir une photo"}
                    </button>
                    {current && (
                      <button type="button" disabled={busy} onClick={() => reset(slot.key)} className="btn btn-danger-outline btn-sm">
                        Rétablir la photo par défaut
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
