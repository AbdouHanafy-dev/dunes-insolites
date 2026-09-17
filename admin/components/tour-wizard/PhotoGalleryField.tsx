"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { inputClass } from "@/components/payload/fields";

export type TourPhoto = { url: string; caption: string | null };

async function uploadFile(file: File): Promise<string | null> {
  const form = new FormData();
  form.set("file", file);
  const res = await fetch("/api/proxy/media-upload?companyType=DUNES_INSOLITES", {
    method: "POST",
    body: form,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url as string;
}

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
  const toast = useToast();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  async function onCoverChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCover(true);
    const url = await uploadFile(file);
    setUploadingCover(false);
    if (!url) {
      toast.error("Envoi impossible.");
      return;
    }
    onCoverChange(url);
  }

  async function onGalleryFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingGallery(true);
    const url = await uploadFile(file);
    setUploadingGallery(false);
    if (!url) {
      toast.error("Envoi impossible.");
      return;
    }
    onPhotosChange([...photos, { url, caption: "" }]);
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
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onCoverChosen}
        />
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="btn btn-secondary btn-sm mt-2"
        >
          {uploadingCover ? "Envoi…" : coverPhotoUrl ? "Changer" : "+ Choisir une photo"}
        </button>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-navy-700/70">Galerie</p>
        {photos.length === 0 ? (
          <p className="mb-2 text-sm text-gray-400">Aucune photo dans la galerie.</p>
        ) : (
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <div key={index} className="overflow-hidden rounded-xl border border-navy-700/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption ?? ""} className="aspect-square w-full object-cover" />
                <div className="flex flex-col gap-1.5 p-2">
                  <input
                    className={`${inputClass} !py-1.5 !text-[12px]`}
                    placeholder="Légende (optionnel)"
                    value={photo.caption ?? ""}
                    onChange={(e) =>
                      onPhotosChange(photos.map((p, i) => (i === index ? { ...p, caption: e.target.value } : p)))
                    }
                  />
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
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onGalleryFileChosen}
        />
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={uploadingGallery}
          className="rounded-lg border border-dashed border-navy-700/20 px-4 py-3 text-sm font-medium text-navy-700/70 hover:border-gold/50 hover:text-navy-800"
        >
          {uploadingGallery ? "Envoi…" : "+ Ajouter une photo à la galerie"}
        </button>
      </div>
    </div>
  );
}
