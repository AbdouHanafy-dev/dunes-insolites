"use client";

import { useState } from "react";
import MediaPicker from "@/components/MediaPicker";
import { inputClass, labelClass } from "@/components/payload/fields";

export type ItineraryStep = {
  label: string;
  title: string;
  description: string;
  segmentType: "ACTIVITY" | "TRANSFER";
  optionalSegment: boolean;
  durationMinutes: number | null;
  /** Empty string = not set. Which of the three applies depends on the step's position. */
  pickupPoint: string;
  dropoffPoint: string;
  attraction: string;
  imageUrls: string[];
};

type PositionalKey = "pickupPoint" | "dropoffPoint" | "attraction";

/** What an itinerary step can name depends on where it sits: first = pickup, last = drop-off, between = attraction. */
export function positionalFields(
  index: number,
  total: number,
): { key: PositionalKey; tick: string; label: string; placeholder: string }[] {
  const pickup = {
    key: "pickupPoint" as const,
    tick: "Lieu de prise en charge",
    label: "Lieu de prise en charge",
    placeholder: "ex. Tunis Clock Tower, Tunis",
  };
  const dropoff = {
    key: "dropoffPoint" as const,
    tick: "Lieu de dépose",
    label: "Lieu de dépose",
    placeholder: "ex. Bab al-Bhar, Tunis",
  };
  const attraction = {
    key: "attraction" as const,
    tick: "Attraction à cette étape",
    label: "Attraction",
    placeholder: "ex. Amphithéâtre d'El Jem, Tunisie",
  };
  if (total === 1) return [pickup, dropoff];
  if (index === 0) return [pickup];
  if (index === total - 1) return [dropoff];
  return [attraction];
}

/** Drops what does not belong to the step's position, e.g. an attraction left on a step later moved to the end. */
export function stepForSave(step: ItineraryStep, index: number, total: number) {
  const keep = new Set<string>(positionalFields(index, total).map((f) => f.key));
  return {
    ...step,
    pickupPoint: keep.has("pickupPoint") ? step.pickupPoint.trim() || null : null,
    dropoffPoint: keep.has("dropoffPoint") ? step.dropoffPoint.trim() || null : null,
    attraction: keep.has("attraction") ? step.attraction.trim() || null : null,
  };
}

export function emptyStep(): ItineraryStep {
  return {
    label: "",
    title: "",
    description: "",
    segmentType: "ACTIVITY",
    optionalSegment: false,
    durationMinutes: null,
    pickupPoint: "",
    dropoffPoint: "",
    attraction: "",
    imageUrls: [],
  };
}

/**
 * The circuit's step-by-step programme. Each step can carry an optional pickup point
 * (tick the box, a field appears) and any number of images; both are shown in that
 * step on the circuit page.
 */
export default function ItineraryStepsField({
  steps,
  onChange,
}: {
  steps: ItineraryStep[];
  onChange: (steps: ItineraryStep[]) => void;
}) {
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  // Ticking "pickup point" opens the field before anything is typed, so it
  // is tracked apart from the value itself.
  const [pickupOpen, setPickupOpen] = useState<Set<string>>(new Set());

  function patch(index: number, fields: Partial<ItineraryStep>) {
    onChange(steps.map((s, i) => (i === index ? { ...s, ...fields } : s)));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setPickupOpen(new Set());
  }

  function remove(index: number) {
    onChange(steps.filter((_, i) => i !== index));
    setPickupOpen(new Set());
  }

  function moveImage(stepIndex: number, from: number, dir: -1 | 1) {
    const urls = [...steps[stepIndex].imageUrls];
    const to = from + dir;
    if (to < 0 || to >= urls.length) return;
    [urls[from], urls[to]] = [urls[to], urls[from]];
    patch(stepIndex, { imageUrls: urls });
  }

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, index) => {
        return (
          <div key={index} className="rounded-xl border border-navy-700/10 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy-700/40">
                Étape {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Monter"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-md border border-navy-700/15 px-2 py-1 text-xs disabled:opacity-30"
                >
                  <i className="bi bi-arrow-up" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Descendre"
                  onClick={() => move(index, 1)}
                  disabled={index === steps.length - 1}
                  className="rounded-md border border-navy-700/15 px-2 py-1 text-xs disabled:opacity-30"
                >
                  <i className="bi bi-arrow-down" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-md border border-rose/25 px-2.5 py-1 text-xs font-medium text-rose hover:bg-rose/8"
                >
                  Retirer
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Repère</label>
                <input
                  className={inputClass}
                  placeholder="ex. Jour 1 ou 09h00"
                  value={step.label}
                  onChange={(e) => patch(index, { label: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Titre</label>
                <input
                  className={inputClass}
                  value={step.title}
                  onChange={(e) => patch(index, { title: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} min-h-24`}
                value={step.description}
                onChange={(e) => patch(index, { description: e.target.value })}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Type</label>
                <select
                  className={inputClass}
                  value={step.segmentType}
                  onChange={(e) => patch(index, { segmentType: e.target.value as ItineraryStep["segmentType"] })}
                >
                  <option value="ACTIVITY">Activité</option>
                  <option value="TRANSFER">Transfert</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Durée (minutes)</label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  step={1}
                  value={step.durationMinutes ?? ""}
                  onChange={(e) =>
                    patch(index, { durationMinutes: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm text-navy-700/80">
              <input
                type="checkbox"
                checked={step.optionalSegment}
                onChange={(e) => patch(index, { optionalSegment: e.target.checked })}
                className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
              />
              Optionnel (« Optionnel · supplément possible » est affiché sous l&apos;étape)
            </label>

            {positionalFields(index, steps.length).map((pf) => {
              const openKey = `${index}:${pf.key}`;
              const shown = step[pf.key] !== "" || pickupOpen.has(openKey);
              return (
                <div key={pf.key}>
                  <label className="mt-2 flex items-center gap-2 text-sm text-navy-700/80">
                    <input
                      type="checkbox"
                      checked={shown}
                      onChange={(e) => {
                        const next = new Set(pickupOpen);
                        if (e.target.checked) {
                          next.add(openKey);
                        } else {
                          next.delete(openKey);
                          patch(index, { [pf.key]: "" });
                        }
                        setPickupOpen(next);
                      }}
                      className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                    />
                    {pf.tick}
                  </label>
                  {shown && (
                    <div className="mt-2 flex flex-col gap-1">
                      <label className={labelClass}>{pf.label}</label>
                      <input
                        className={inputClass}
                        placeholder={pf.placeholder}
                        value={step[pf.key]}
                        onChange={(e) => patch(index, { [pf.key]: e.target.value })}
                      />
                      <p className="text-[12px] text-navy-700/45">
                        Affiché dans cette étape, et utilisé pour tracer l&apos;itinéraire sur la carte de la page
                        du circuit : écrivez un nom que Google Maps reconnaît (lieu + ville ou pays).
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-4">
              <p className={`${labelClass} mb-2`}>Images de l&apos;étape</p>
              {step.imageUrls.length > 0 && (
                <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {step.imageUrls.map((url, i) => (
                    <div key={url} className="overflow-hidden rounded-lg border border-navy-700/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
                      <div className="flex gap-1 p-1">
                        <button
                          type="button"
                          aria-label="Avant"
                          disabled={i === 0}
                          onClick={() => moveImage(index, i, -1)}
                          className="flex-1 rounded border border-navy-700/15 py-0.5 text-xs disabled:opacity-30"
                        >
                          <i className="bi bi-arrow-left" aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label="Après"
                          disabled={i === step.imageUrls.length - 1}
                          onClick={() => moveImage(index, i, 1)}
                          className="flex-1 rounded border border-navy-700/15 py-0.5 text-xs disabled:opacity-30"
                        >
                          <i className="bi bi-arrow-right" aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label="Retirer l'image"
                          onClick={() => patch(index, { imageUrls: step.imageUrls.filter((_, k) => k !== i) })}
                          className="flex-1 rounded border border-rose/25 py-0.5 text-xs text-rose"
                        >
                          <i className="bi bi-x-lg" aria-hidden />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setPickerFor(index)}
                className="rounded-lg border border-dashed border-navy-700/20 px-4 py-2 text-sm font-medium text-navy-700/70 hover:border-gold/50 hover:text-navy-800"
              >
                + Ajouter des images
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...steps, emptyStep()])}
        className="rounded-lg border border-dashed border-navy-700/20 px-4 py-3 text-sm font-medium text-navy-700/70 hover:border-gold/50 hover:text-navy-800"
      >
        + Ajouter une étape
      </button>

      {pickerFor !== null && (
        <MediaPicker
          title="Images de l'étape"
          multiple
          onClose={() => setPickerFor(null)}
          onPick={(urls) => {
            const current = steps[pickerFor]?.imageUrls ?? [];
            patch(pickerFor, { imageUrls: [...current, ...urls.filter((u) => !current.includes(u))] });
            setPickerFor(null);
          }}
        />
      )}
    </div>
  );
}
