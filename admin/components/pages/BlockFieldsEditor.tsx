"use client";

import { useEffect, useState } from "react";
import { FieldInput, inputClass, labelClass } from "@/components/payload/fields";
import RepeaterField from "@/components/payload/RepeaterField";
import { blockTypeDef, blockPreviewLabel, parseBlockData } from "./blockTypes";
import type { AdminContentBlock, AdminTourType } from "@/lib/api";

/**
 * The field form for one block's data — extracted out of PageBuilder so
 * the standalone reusable-block editor (ContentBlockEditor.tsx) can render
 * the exact same typed-fields/repeater/accommodation-picker UI for a
 * single block, not just for one entry in a Page's block list.
 */
export default function BlockFieldsEditor({
  type,
  dataJson,
  tourTypes,
  onChange,
}: {
  type: string;
  dataJson: string;
  tourTypes: AdminTourType[];
  onChange: (data: Record<string, unknown>) => void;
}) {
  const def = blockTypeDef(type);
  const data = parseBlockData(dataJson);

  if (type === "accommodationShowcase") {
    return <AccommodationPicker data={data} tourTypes={tourTypes} onChange={onChange} />;
  }

  if (type === "blockReference") {
    return <BlockReferencePicker data={data} onChange={onChange} />;
  }

  if (!def || def.fields.length === 0) {
    return (
      <textarea
        className={`${inputClass} min-h-24 font-mono text-xs`}
        value={dataJson}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value || "{}"));
          } catch {
            // Invalid JSON mid-typing — ignore until it parses again,
            // same tolerance PageBuilder's raw-JSON fallback always had.
          }
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {def.fields.map((f) => {
        if (f.type === "repeater") {
          return (
            <div key={f.key} className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass}>{f.label}</label>
              <RepeaterField
                itemLabel={f.itemLabel}
                fields={f.fields}
                items={(data[f.key] as Record<string, unknown>[] | undefined) ?? []}
                onChange={(items) => onChange({ ...data, [f.key]: items })}
              />
            </div>
          );
        }
        return (
          <div key={f.key} className={`flex flex-col gap-1 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
            <label className={labelClass}>{f.label}</label>
            <FieldInput field={f} value={data[f.key]} onChange={(v) => onChange({ ...data, [f.key]: v })} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Fetches the reusable-blocks list itself (via the BFF proxy, client-side)
 * rather than requiring every caller to thread it in as a prop the way
 * `tourTypes` is — this is the only place in the block builder that needs
 * it, so keeping the fetch local avoids widening PageBuilder's/
 * ContentBlockEditor's props for one special case.
 */
function BlockReferencePicker({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const [blocks, setBlocks] = useState<AdminContentBlock[] | null>(null);

  useEffect(() => {
    fetch("/api/proxy/content-blocks")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AdminContentBlock[]) => setBlocks(data))
      .catch(() => setBlocks([]));
  }, []);

  const selectedId = (data.blockId as string | undefined) ?? "";

  if (blocks === null) {
    return <p className="text-sm text-navy-700/50">Chargement des blocs…</p>;
  }
  if (blocks.length === 0) {
    return (
      <p className="text-sm text-navy-700/50">
        Aucun bloc de contenu réutilisable pour le moment — crée-en un dans{" "}
        <span className="font-medium">Contenu → Blocs de contenu</span>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>Bloc référencé</label>
      <select
        className={inputClass}
        value={selectedId}
        onChange={(e) => onChange({ ...data, blockId: e.target.value })}
      >
        <option value="">— Choisir —</option>
        {blocks.map((b) => (
          <option key={b.blockId} value={b.blockId}>
            {blockTypeDef(b.type)?.icon} {b.label} — {blockPreviewLabel(b.type, b.dataJson)}
          </option>
        ))}
      </select>
    </div>
  );
}

function AccommodationPicker({
  data,
  tourTypes,
  onChange,
}: {
  data: Record<string, unknown>;
  tourTypes: AdminTourType[];
  onChange: (data: Record<string, unknown>) => void;
}) {
  const selected: string[] = (data.tourTypeIds as string[] | undefined) ?? [];

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange({ ...data, tourTypeIds: next });
  }

  if (tourTypes.length === 0) {
    return <p className="text-sm text-navy-700/50">Aucun hébergement dans le catalogue.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className={labelClass}>Hébergements affichés</p>
      {tourTypes.map((tt) => (
        <label
          key={tt.tourTypeId}
          className="flex items-center gap-2.5 rounded-lg border border-navy-700/10 bg-white px-3 py-2 text-sm text-navy-800"
        >
          <input
            type="checkbox"
            checked={selected.includes(tt.tourTypeId)}
            onChange={() => toggle(tt.tourTypeId)}
            className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
          />
          {tt.name}
        </label>
      ))}
    </div>
  );
}
