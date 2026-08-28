"use client";

import { useState } from "react";
import { FieldInput, inputClass, labelClass } from "@/components/payload/fields";
import RepeaterField from "@/components/payload/RepeaterField";
import { BLOCK_TYPES, blockTypeDef, blockPreviewLabel, parseBlockData } from "./blockTypes";
import type { PageBlock, AdminTourType } from "@/lib/api";

export default function PageBuilder({
  blocks,
  onChange,
  tourTypes,
}: {
  blocks: PageBlock[];
  onChange: (blocks: PageBlock[]) => void;
  tourTypes: AdminTourType[];
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  function addBlock(type: string) {
    const next = [...blocks, { type, dataJson: "{}" }];
    onChange(next);
    setExpanded(next.length - 1);
    setAdding(false);
  }

  function updateBlockData(index: number, data: Record<string, unknown>) {
    const next = blocks.map((b, i) => (i === index ? { ...b, dataJson: JSON.stringify(data) } : b));
    onChange(next);
  }

  function duplicateBlock(index: number) {
    const copy = { ...blocks[index] };
    const next = [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)];
    onChange(next);
  }

  function deleteBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
    setExpanded(null);
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-navy-700/15 px-5 py-8 text-center text-sm text-navy-700/45">
          Aucun bloc — commencez par en ajouter un.
        </p>
      )}

      {blocks.map((block, index) => {
        const def = blockTypeDef(block.type);
        const isOpen = expanded === index;
        return (
          <div key={index} className="overflow-hidden rounded-xl border border-navy-700/10 bg-white">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-navy-700/25">⋮⋮</span>
              <span className="text-lg">{def?.icon ?? "🧩"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-navy-700/40">
                  {def?.label ?? block.type}
                </p>
                <p className="truncate text-sm text-navy-800">
                  {blockPreviewLabel(block.type, block.dataJson)}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="h-7 w-7 rounded-md text-navy-700/50 hover:bg-navy-700/8 disabled:opacity-25"
                  title="Monter"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === blocks.length - 1}
                  className="h-7 w-7 rounded-md text-navy-700/50 hover:bg-navy-700/8 disabled:opacity-25"
                  title="Descendre"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : index)}
                  className="rounded-md border border-navy-700/15 px-2.5 py-1 text-xs font-medium text-navy-700 hover:bg-navy-700/5"
                >
                  {isOpen ? "Fermer" : "Modifier"}
                </button>
                <button
                  type="button"
                  onClick={() => duplicateBlock(index)}
                  className="rounded-md border border-navy-700/15 px-2.5 py-1 text-xs font-medium text-navy-700 hover:bg-navy-700/5"
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => deleteBlock(index)}
                  className="rounded-md border border-rose/25 px-2.5 py-1 text-xs font-medium text-rose hover:bg-rose/8"
                >
                  Supprimer
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-navy-700/8 bg-surface-alt/60 p-4">
                {block.type === "accommodationShowcase" ? (
                  <AccommodationPicker
                    data={parseBlockData(block.dataJson)}
                    tourTypes={tourTypes}
                    onChange={(data) => updateBlockData(index, data)}
                  />
                ) : def && def.fields.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {def.fields.map((f) => {
                      const data = parseBlockData(block.dataJson);
                      if (f.type === "repeater") {
                        return (
                          <div key={f.key} className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className={labelClass}>{f.label}</label>
                            <RepeaterField
                              itemLabel={f.itemLabel}
                              fields={f.fields}
                              items={(data[f.key] as Record<string, unknown>[] | undefined) ?? []}
                              onChange={(items) => updateBlockData(index, { ...data, [f.key]: items })}
                            />
                          </div>
                        );
                      }
                      return (
                        <div
                          key={f.key}
                          className={`flex flex-col gap-1 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}
                        >
                          <label className={labelClass}>{f.label}</label>
                          <FieldInput
                            field={f}
                            value={data[f.key]}
                            onChange={(v) => updateBlockData(index, { ...data, [f.key]: v })}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    className={`${inputClass} min-h-24 font-mono text-xs`}
                    value={block.dataJson}
                    onChange={(e) => {
                      const next = blocks.map((b, i) =>
                        i === index ? { ...b, dataJson: e.target.value } : b,
                      );
                      onChange(next);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-navy-700/10 bg-white p-3">
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.type}
              type="button"
              onClick={() => addBlock(bt.type)}
              className="flex items-center gap-2 rounded-lg border border-navy-700/15 px-3 py-2 text-sm text-navy-700 hover:border-gold/50 hover:bg-gold/8"
            >
              <span>{bt.icon}</span> {bt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="ml-auto rounded-lg px-3 py-2 text-sm text-navy-700/50 hover:bg-navy-700/5"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg border border-dashed border-navy-700/20 px-4 py-3 text-sm font-medium text-navy-700/70 hover:border-gold/50 hover:text-navy-800"
        >
          + Ajouter un bloc
        </button>
      )}
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
