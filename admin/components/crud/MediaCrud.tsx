"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import type { AdminMediaAsset } from "@/lib/api";
import { uploadImage } from "@/lib/uploadImage";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function MediaLibrary({ initialItems }: { initialItems: AdminMediaAsset[] }) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminMediaAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setUploading(true);
    setError("");
    const result = await uploadImage(file);
    setUploading(false);

    if (result.url === null) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success("Fichier envoyé");
    router.refresh();
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/media/${deleteTarget.assetId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Suppression impossible.");
      toast.error("Suppression impossible.");
      return;
    }
    toast.success("Supprimé avec succès");
    setDeleteTarget(null);
    router.refresh();
  }

  function copyUrl(asset: AdminMediaAsset) {
    navigator.clipboard?.writeText(asset.url).then(() => {
      setCopiedId(asset.assetId);
      setTimeout(() => setCopiedId((c) => (c === asset.assetId ? null : c)), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Médiathèque</h1>
          <p className="mt-1 text-sm text-navy-700/55">
            {initialItems.length} fichier(s) · JPEG, PNG, WebP, GIF, SVG — 8 Mo max. Copie l&apos;URL
            d&apos;une image pour l&apos;utiliser dans un champ &quot;Image (URL)&quot; d&apos;un bloc.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={onFileChosen}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary"
          >
            {uploading ? "Envoi…" : "+ Ajouter un fichier"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
          {error}
        </div>
      )}

      {initialItems.length === 0 ? (
        <div className="card rounded-2xl px-6 py-16 text-center">
          <p className="text-sm text-gray-400">Aucun fichier pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {initialItems.map((asset) => (
            <div key={asset.assetId} className="card overflow-hidden rounded-2xl">
              <div className="aspect-square bg-navy-700/5">
                {asset.mimeType.startsWith("image/") && (
                  // Uploaded, admin-controlled URLs from our own backend —
                  // next/image's remote-pattern allowlist isn't worth
                  // configuring for a library this small; a plain <img>
                  // is the honest choice here, not a workaround.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-[13px] font-medium text-navy-800" title={asset.filename}>
                  {asset.filename}
                </p>
                <p className="text-[11px] text-navy-700/45">{formatSize(asset.sizeBytes)}</p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyUrl(asset)}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    {copiedId === asset.assetId ? "Copié !" : "Copier l'URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(asset)}
                    className="btn btn-danger-outline btn-sm"
                  >
                    Suppr.
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-navy-700/80">
            Supprimer <strong>{deleteTarget.filename}</strong> ? Toute page utilisant cette image
            l&apos;affichera cassée. Cette action est irréversible.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={onDelete} disabled={busy} className="btn btn-danger">
              {busy ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
