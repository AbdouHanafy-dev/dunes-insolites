"use client";

import { useState } from "react";
import MediaPicker from "@/components/MediaPicker";
import { inputClass } from "@/components/payload/fields";

export type TourPhoto = { url: string; caption: string | null };

/** Cover photo (single) + gallery (many, with captions) — both upload
 *  through the same media library the rest of the admin already uses
 *  (see MediaCrud.tsx's MediaLibrary), just inline instead of copy-pasting
 *  a URL from a separate page. */
export default function PhotoGalleryField({
  coverPhotoUrl,
  onCoverChange,
  photos,
  onPhotosChange,
}: {
  coverPhotoUrl: string | null;
  onCoverChange: (url: string | null) => void;
  photos: TourPhoto[];
  onPhotosChange: (photos: TourPhoto[]) => void;
}) {
  const [picker, setPicker] = useState<"cover" | "gallery" | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  /** Moves one photo to a new position; the array order is the display order. */
  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onPhotosChange(next);
  }

  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-[13px] font-medium text-navy-700/70">Photo de couverture</p>
        {coverPhotoUrl ? (
          <div className="relative w-56 overflow-hidden rounded-xl border border-navy-700/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPhotoUrl} alt="Couverture" className="aspect-video w-full object-cover" />
            <button
              type="button"
              onClick={() => onCoverChange(null)}
              className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-rose hover:bg-white"
            >
              Retirer
            </button>
          </div>
        ) : (
          <p className="mb-2 text-sm text-gray-400">Aucune photo de couverture.</p>
        )}
        <button type="button" onClick={() => setPicker("cover")} className="btn btn-secondary btn-sm mt-2">
          {coverPhotoUrl ? "Changer" : "+ Choisir une photo"}
        </button>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-navy-700/70">Galerie</p>
        {photos.length > 1 && (
          <p className="mb-2 text-[12px] text-navy-700/45">
            Glissez-déposez les photos (ou utilisez les flèches) pour définir leur ordre d’affichage.
          </p>
        )}
        {photos.length === 0 ? (
          <p className="mb-2 text-sm text-gray-400">Aucune photo dans la galerie.</p>
        ) : (
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => {
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  setOverIndex(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null) move(dragIndex, index);
                  endDrag();
                }}
                onDragEnd={endDrag}
                className={`relative cursor-grab overflow-hidden rounded-xl border bg-white active:cursor-grabbing ${
                  overIndex === index && dragIndex !== index
                    ? "border-gold ring-2 ring-gold/40"
                    : "border-navy-700/10"
                } ${dragIndex === index ? "opacity-40" : ""}`}
              >
                <span className="absolute left-2 top-2 z-10 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-bold text-navy-800">
                  {index + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? ""}
                  draggable={false}
                  className="aspect-square w-full select-none object-cover"
                />
                <div className="flex flex-col gap-1.5 p-2">
                  <input
                    className={`${inputClass} !py-1.5 !text-[12px]`}
                    placeholder="Légende (optionnel)"
                    value={photo.caption ?? ""}
                    onChange={(e) =>
                      onPhotosChange(photos.map((p, i) => (i === index ? { ...p, caption: e.target.value } : p)))
                    }
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      aria-label="Déplacer vers le début"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      className="flex-1 rounded-md border border-navy-700/15 py-1 text-xs text-navy-700/70 hover:bg-navy-700/5 disabled:opacity-30"
                    >
                      <i className="bi bi-arrow-left" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Déplacer vers la fin"
                      disabled={index === photos.length - 1}
                      onClick={() => move(index, index + 1)}
                      className="flex-1 rounded-md border border-navy-700/15 py-1 text-xs text-navy-700/70 hover:bg-navy-700/5 disabled:opacity-30"
                    >
                      <i className="bi bi-arrow-right" aria-hidden />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPhotosChange(photos.filter((_, i) => i !== index))}
                    className="rounded-md border border-rose/25 py-1 text-xs font-medium text-rose hover:bg-rose/8"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setPicker("gallery")}
          className="rounded-lg border border-dashed border-navy-700/20 px-4 py-3 text-sm font-medium text-navy-700/70 hover:border-gold/50 hover:text-navy-800"
        >
          + Ajouter des photos à la galerie
        </button>
      </div>

      {picker === "cover" && (
        <MediaPicker
          title="Photo de couverture"
          onClose={() => setPicker(null)}
          onPick={([url]) => {
            onCoverChange(url);
            setPicker(null);
          }}
        />
      )}
      {picker === "gallery" && (
        <MediaPicker
          title="Ajouter à la galerie"
          multiple
          onClose={() => setPicker(null)}
          onPick={(urls) => {
            onPhotosChange([...photos, ...urls.map((url) => ({ url, caption: "" }))]);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
