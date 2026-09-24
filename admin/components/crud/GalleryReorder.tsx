"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { moveItem } from "@/lib/reorder";
import type { AdminGalleryImage } from "@/lib/api";

/**
 * Drag the photos into the order the public gallery and homepage strip
 * should show them. Dropping saves straight away (PUT /gallery/order); the
 * site reads the same `position` the table below shows.
 */
export default function GalleryReorder({ initialItems }: { initialItems: AdminGalleryImage[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initialItems);
  const [prevInitial, setPrevInitial] = useState(initialItems);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-sync when the server data changes (after a refresh, create or delete).
  if (initialItems !== prevInitial) {
    setPrevInitial(initialItems);
    setItems(initialItems);
  }

  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
  }

  async function drop(to: number) {
    const from = dragIndex;
    endDrag();
    if (from === null || from === to) return;
    const previous = items;
    const next = moveItem(items, from, to);
    setItems(next);
    setSaving(true);
    const res = await fetch("/api/proxy/gallery/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((i) => i.galleryItemId) }),
    });
    setSaving(false);
    if (!res.ok) {
      setItems(previous);
      toast.error(res.status === 403 ? "Votre rôle ne permet pas de réordonner la galerie." : "Enregistrement de l’ordre impossible.");
      return;
    }
    toast.success("Ordre enregistré — visible sur le site d’ici une minute");
    router.refresh();
  }

  if (items.length < 2) return null;

  return (
    <div className="card rounded-2xl p-5">
      <h2 className="text-[15px] font-bold text-navy-800">Ordre d’affichage</h2>
      <p className="mt-1 text-[12px] text-navy-700/55">
        Glissez-déposez les photos pour choisir leur ordre : la première apparaît en premier sur le site.
      </p>
      <ul className={`mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7 ${saving ? "opacity-60" : ""}`}>
        {items.map((item, index) => (
          <li
            key={item.galleryItemId}
            draggable={!saving}
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
              void drop(index);
            }}
            onDragEnd={endDrag}
            title={item.alt}
            className={`relative cursor-grab overflow-hidden rounded-xl border-2 bg-white active:cursor-grabbing ${
              overIndex === index && dragIndex !== index ? "border-gold ring-2 ring-gold/40" : "border-navy-700/10"
            } ${dragIndex === index ? "opacity-40" : ""}`}
          >
            <span className="absolute left-1.5 top-1.5 z-10 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-bold text-navy-800">
              {index + 1}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.alt}
              draggable={false}
              className="aspect-square w-full select-none object-cover"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
