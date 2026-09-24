"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { inputClass } from "@/components/payload/fields";
import type { AdminMediaAsset } from "@/lib/api";
import { uploadImage } from "@/lib/uploadImage";
import { moveItem } from "@/lib/reorder";

/**
 * The one way to choose a photo in the backoffice: opens the media library
 * (photos already on the site) with an "envoyer depuis mon ordinateur" button
 * on top. Picking an existing photo never re-uploads it; a freshly uploaded
 * one is picked straight away.
 *
 * `multiple` lets the gallery add several photos in one go (existing ones by
 * ticking them, new ones by selecting several files).
 *
 * Photos can be dragged into the order the library should show them (saved
 * for everyone, in every picker). Dragging is off while a search is active,
 * since the visible list is then only part of the library.
 */
export default function MediaPicker({
  title = "Choisir une photo",
  multiple = false,
  onClose,
  onPick,
}: {
  title?: string;
  multiple?: boolean;
  onClose: () => void;
  onPick: (urls: string[]) => void;
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<AdminMediaAsset[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/media")
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as AdminMediaAsset[];
      })
      .then((list) => {
        if (!cancelled) setAssets(list.filter((a) => a.mimeType.startsWith("image/")));
      })
      .catch(() => {
        if (!cancelled) {
          setAssets([]);
          setLoadError("La médiathèque n’a pas pu être chargée. Vous pouvez quand même envoyer une photo depuis votre ordinateur.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (assets ?? []).filter((a) => !q || a.filename.toLowerCase().includes(q));
  }, [assets, search]);

  const canReorder = search.trim() === "" && assets !== null && assets.length > 1;

  function endDrag() {
    setDragId(null);
    setOverId(null);
  }

  async function dropOn(targetId: string) {
    const fromId = dragId;
    endDrag();
    if (!assets || fromId === null || fromId === targetId) return;
    const from = assets.findIndex((a) => a.assetId === fromId);
    const to = assets.findIndex((a) => a.assetId === targetId);
    if (from < 0 || to < 0) return;
    const previous = assets;
    const next = moveItem(assets, from, to);
    setAssets(next);
    // Non-image files are filtered out of this list, so send only what is shown:
    // the server numbers them in this order.
    const res = await fetch("/api/proxy/media/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((a) => a.assetId) }),
    });
    if (!res.ok) {
      setAssets(previous);
      toast.error(res.status === 403 ? "Votre rôle ne permet pas de réordonner la médiathèque." : "Enregistrement de l’ordre impossible.");
    }
  }

  function toggle(url: string) {
    if (!multiple) {
      onPick([url]);
      return;
    }
    setSelected((cur) => (cur.includes(url) ? cur.filter((u) => u !== url) : [...cur, url]));
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      const result = await uploadImage(file);
      if (result.url === null) toast.error(`${file.name} : ${result.error}`);
      else urls.push(result.url);
    }
    setUploading(false);
    if (urls.length > 0) onPick(urls);
  }

  // Portalled to <body>: it opens from inside other modals (e.g. Nouveau tier),
  // and a nested fixed overlay would inherit their scroll and stacking.
  return createPortal(
    <Modal title={title} onClose={onClose} wide>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFiles}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-primary btn-sm"
        >
          {uploading ? "Envoi en cours…" : "⬆ Envoyer depuis mon ordinateur"}
        </button>
        <input
          className={`${inputClass} !w-auto min-w-[180px] flex-1 !py-2 !text-[13px]`}
          placeholder="Rechercher dans la médiathèque…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loadError && <p className="mb-3 text-sm text-rose">{loadError}</p>}

      {assets === null ? (
        <p className="py-10 text-center text-sm text-gray-400">Chargement de la médiathèque…</p>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          {assets.length === 0 ? "Aucune photo pour l’instant : envoyez la première." : "Aucune photo ne correspond."}
        </p>
      ) : (
        <>
        {canReorder && (
          <p className="mb-2 text-[12px] text-navy-700/50">Glissez-déposez les photos pour changer leur ordre.</p>
        )}
        <ul className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
          {visible.map((asset) => {
            const on = selected.includes(asset.url);
            return (
              <li
                key={asset.assetId}
                draggable={canReorder}
                onDragStart={(e) => {
                  setDragId(asset.assetId);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (dragId === null) return;
                  e.preventDefault();
                  setOverId(asset.assetId);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void dropOn(asset.assetId);
                }}
                onDragEnd={endDrag}
                className={`${dragId === asset.assetId ? "opacity-40" : ""} ${
                  overId === asset.assetId && dragId !== asset.assetId ? "rounded-xl ring-2 ring-gold/60" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(asset.url)}
                  title={asset.filename}
                  className={`relative block w-full overflow-hidden rounded-xl border-2 text-left transition ${
                    on ? "border-gold" : "border-navy-700/10 hover:border-gold/50"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.filename} loading="lazy" draggable={false} className="aspect-square w-full object-cover" />
                  {on && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-xs font-bold text-white">
                      ✓
                    </span>
                  )}
                  <span className="block truncate px-2 py-1 text-[11px] text-navy-700/60">{asset.filename}</span>
                </button>
              </li>
            );
          })}
        </ul>
        </>
      )}

      {multiple && (
        <div className="mt-5 flex items-center justify-end gap-3">
          <span className="text-sm text-navy-700/60">{selected.length} sélectionnée(s)</span>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Annuler
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => onPick(selected)}
            className="btn btn-primary btn-sm"
          >
            Ajouter
          </button>
        </div>
      )}
    </Modal>,
    document.body,
  );
}
