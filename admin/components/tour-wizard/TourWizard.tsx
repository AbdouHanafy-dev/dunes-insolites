"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import RepeaterField from "@/components/payload/RepeaterField";
import StringListField from "./StringListField";
import PhotoGalleryField, { type TourPhoto } from "./PhotoGalleryField";
import TranslationsField, { type TourTranslationForm } from "./TranslationsField";
import type { AdminTour } from "@/lib/api";

type ProgramStep = { label: string; title: string; description: string };

type TourForm = {
  name: string;
  slug: string;
  description: string;
  duration: string;
  location: string;
  groupSizeType: string;
  aboutText: string;
  highlights: string[];
  includedItems: string[];
  notIncludedItems: string[];
  programSteps: ProgramStep[];
  meetingPoint: string;
  languages: string[];
  cancellationFreeCancellation: boolean;
  cancellationHoursBeforeDeadline: number | null;
  coverPhotoUrl: string | null;
  photos: TourPhoto[];
  translations: Record<string, TourTranslationForm>;
  passengerAdultPrice: number;
  passengerChildPrice: number;
  partnerAdultPrice: number;
  partnerChildPrice: number;
  tva: number;
  isActive: boolean;
};

const EMPTY_FORM: TourForm = {
  name: "",
  slug: "",
  description: "",
  duration: "",
  location: "",
  groupSizeType: "TOUTES_TAILLES",
  aboutText: "",
  highlights: [],
  includedItems: [],
  notIncludedItems: [],
  programSteps: [],
  meetingPoint: "",
  languages: ["FR"],
  cancellationFreeCancellation: false,
  cancellationHoursBeforeDeadline: null,
  coverPhotoUrl: null,
  photos: [],
  translations: {},
  passengerAdultPrice: 0,
  passengerChildPrice: 0,
  partnerAdultPrice: 0,
  partnerChildPrice: 0,
  tva: 13,
  isActive: true,
};

function fromInitialData(data?: AdminTour): TourForm {
  if (!data) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    name: data.name,
    slug: data.slug ?? "",
    description: data.description ?? "",
    duration: data.duration ?? "",
    location: data.location ?? "",
    groupSizeType: data.groupSizeType ?? EMPTY_FORM.groupSizeType,
    aboutText: data.aboutText ?? "",
    highlights: data.highlights ?? [],
    includedItems: data.includedItems ?? [],
    notIncludedItems: data.notIncludedItems ?? [],
    programSteps: (data.programSteps ?? []).map((s) => ({
      label: s.label ?? "",
      title: s.title ?? "",
      description: s.description ?? "",
    })),
    meetingPoint: data.meetingPoint ?? "",
    languages: data.languages ?? EMPTY_FORM.languages,
    cancellationFreeCancellation: data.cancellationPolicy?.freeCancellation ?? false,
    cancellationHoursBeforeDeadline: data.cancellationPolicy?.hoursBeforeDeadline ?? null,
    coverPhotoUrl: data.coverPhotoUrl ?? null,
    photos: data.photos ?? [],
    translations: Object.fromEntries(
      (data.translations ?? []).map((t) => [
        t.locale,
        {
          locale: t.locale,
          name: t.name ?? "",
          description: t.description ?? "",
          aboutText: t.aboutText ?? "",
          highlights: t.highlights ?? [],
          includedItems: t.includedItems ?? [],
          notIncludedItems: t.notIncludedItems ?? [],
          programSteps: (t.programSteps ?? []).map((s) => ({
            label: s.label ?? "",
            title: s.title ?? "",
            description: s.description ?? "",
          })),
        } satisfies TourTranslationForm,
      ]),
    ),
    passengerAdultPrice: data.passengerAdultPrice,
    passengerChildPrice: data.passengerChildPrice,
    partnerAdultPrice: data.partnerAdultPrice,
    partnerChildPrice: data.partnerChildPrice,
    tva: data.tva,
    isActive: data.isActive,
  };
}

function toRequestBody(form: TourForm) {
  return {
    name: form.name,
    slug: form.slug || undefined,
    description: form.description || null,
    duration: form.duration || null,
    location: form.location || null,
    groupSizeType: form.groupSizeType || null,
    aboutText: form.aboutText || null,
    highlights: form.highlights,
    includedItems: form.includedItems,
    notIncludedItems: form.notIncludedItems,
    programSteps: form.programSteps,
    meetingPoint: form.meetingPoint || null,
    languages: form.languages,
    cancellationPolicy: {
      freeCancellation: form.cancellationFreeCancellation,
      hoursBeforeDeadline: form.cancellationHoursBeforeDeadline,
    },
    coverPhotoUrl: form.coverPhotoUrl,
    photos: form.photos,
    translations: Object.values(form.translations)
      .filter(
        (t) =>
          t.name.trim() ||
          t.description.trim() ||
          t.aboutText.trim() ||
          t.highlights.length ||
          t.includedItems.length ||
          t.notIncludedItems.length ||
          t.programSteps.length,
      )
      .map((t) => ({
        locale: t.locale,
        name: t.name || null,
        description: t.description || null,
        aboutText: t.aboutText || null,
        highlights: t.highlights,
        includedItems: t.includedItems,
        notIncludedItems: t.notIncludedItems,
        programSteps: t.programSteps,
      })),
    passengerAdultPrice: form.passengerAdultPrice,
    passengerChildPrice: form.passengerChildPrice,
    partnerAdultPrice: form.partnerAdultPrice,
    partnerChildPrice: form.partnerChildPrice,
    tva: form.tva,
    isActive: form.isActive,
  };
}

const GROUP_SIZE_OPTIONS = [
  { value: "PETIT_GROUPE", label: "Petit groupe" },
  { value: "GROUPE_MOYEN", label: "Groupe moyen" },
  { value: "TOUTES_TAILLES", label: "Toutes tailles" },
  { value: "PRIVATIF", label: "Privatif" },
];

const LANGUAGE_OPTIONS = [
  { value: "FR", label: "Français" },
  { value: "EN", label: "Anglais" },
  { value: "AR", label: "Arabe" },
];

const STEPS = [
  "Informations de base",
  "Photos",
  "Itinéraire",
  "Points forts & inclusions",
  "Logistique",
  "Tarifs",
  "Traductions",
  "Aperçu",
] as const;

export default function TourWizard({ id, initialData }: { id?: string; initialData?: AdminTour }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!id;
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(new Set([0]));
  const [form, setForm] = useState<TourForm>(() => fromInitialData(initialData));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  function patch(fields: Partial<TourForm>) {
    setForm((s) => ({ ...s, ...fields }));
  }

  function goTo(next: number) {
    setStep(next);
    setVisited((v) => new Set(v).add(next));
  }

  const basicsValid = form.name.trim().length > 0;
  const pricingValid =
    form.passengerAdultPrice >= 0 &&
    form.passengerChildPrice >= 0 &&
    form.partnerAdultPrice >= 0 &&
    form.partnerChildPrice >= 0;
  const canSubmit = basicsValid && pricingValid;

  async function onSubmit() {
    if (!canSubmit) {
      setStep(0);
      toast.error("Le nom du tour est requis avant de pouvoir l'enregistrer.");
      return;
    }
    setBusy(true);
    setError("");
    const url = isEdit ? `/api/proxy/tours/${id}` : "/api/proxy/tours";
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toRequestBody(form)),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.message ?? data.error ?? "Une erreur est survenue.";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success(isEdit ? "Tour modifié avec succès" : "Tour créé avec succès");
    router.push("/catalogue/tours");
    router.refresh();
  }

  async function onDelete() {
    if (!id) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/tours/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Suppression impossible — ce tour est peut-être référencé ailleurs.");
      setDeleteOpen(false);
      return;
    }
    toast.success("Supprimé avec succès");
    router.push("/catalogue/tours");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/catalogue/tours" className="text-sm text-navy-700/50 hover:underline">
          ← Tours / Circuits
        </Link>
        <h1 className="mt-1 text-xl font-bold text-navy-800">
          {isEdit ? form.name || "Modifier" : "Nouveau tour"}
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => (visited.has(i) || i === step + 1 ? goTo(i) : undefined)}
            disabled={!visited.has(i) && i !== step + 1}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
              i === step
                ? "bg-gold text-navy-900"
                : visited.has(i)
                  ? "bg-navy-700/8 text-navy-700/70 hover:bg-navy-700/12"
                  : "bg-navy-700/4 text-navy-700/30"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="card rounded-2xl p-6">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <Field label="Nom du tour" required>
              <input className={inputClass} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Slug (URL)">
              <input className={inputClass} value={form.slug} onChange={(e) => patch({ slug: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Durée" hint='ex. "3 Jours / 2 Nuits"'>
                <input className={inputClass} value={form.duration} onChange={(e) => patch({ duration: e.target.value })} />
              </Field>
              <Field label="Lieu de départ">
                <input className={inputClass} value={form.location} onChange={(e) => patch({ location: e.target.value })} />
              </Field>
            </div>
            <Field label="Taille de groupe">
              <select
                className={inputClass}
                value={form.groupSizeType}
                onChange={(e) => patch({ groupSizeType: e.target.value })}
              >
                {GROUP_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description courte" hint="Affichée dans les listes et cartes">
              <textarea
                className={`${inputClass} min-h-24`}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
            <Field label="Présentation détaillée" hint="Affichée sur la page du tour">
              <textarea
                className={`${inputClass} min-h-32`}
                value={form.aboutText}
                onChange={(e) => patch({ aboutText: e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <PhotoGalleryField
            coverPhotoUrl={form.coverPhotoUrl}
            onCoverChange={(url) => patch({ coverPhotoUrl: url })}
            photos={form.photos}
            onPhotosChange={(photos) => patch({ photos })}
          />
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-[13px] text-navy-700/55">
              Le programme jour par jour (ou étape par étape) que verra le client.
            </p>
            <RepeaterField
              itemLabel="Étape"
              items={form.programSteps as unknown as Record<string, unknown>[]}
              onChange={(items) => patch({ programSteps: items as unknown as ProgramStep[] })}
              fields={[
                { type: "text", key: "label", label: "Repère", hint: 'ex. "Jour 1" ou "09h00"' },
                { type: "text", key: "title", label: "Titre" },
                { type: "textarea", key: "description", label: "Description" },
              ]}
            />
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6">
            <Field label="Points forts" hint="Ce qui rend ce tour unique">
              <StringListField
                items={form.highlights}
                onChange={(highlights) => patch({ highlights })}
                placeholder="ex. Coucher de soleil sur les dunes"
              />
            </Field>
            <Field label="Inclus">
              <StringListField
                items={form.includedItems}
                onChange={(includedItems) => patch({ includedItems })}
                placeholder="ex. Transport aller-retour"
              />
            </Field>
            <Field label="Non inclus">
              <StringListField
                items={form.notIncludedItems}
                onChange={(notIncludedItems) => patch({ notIncludedItems })}
                placeholder="ex. Pourboires"
              />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-5">
            <Field label="Point de rendez-vous">
              <input
                className={inputClass}
                value={form.meetingPoint}
                onChange={(e) => patch({ meetingPoint: e.target.value })}
              />
            </Field>
            <Field label="Langues parlées">
              <div className="flex gap-4">
                {LANGUAGE_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 text-sm text-navy-700/80">
                    <input
                      type="checkbox"
                      checked={form.languages.includes(o.value)}
                      onChange={(e) =>
                        patch({
                          languages: e.target.checked
                            ? [...form.languages, o.value]
                            : form.languages.filter((l) => l !== o.value),
                        })
                      }
                      className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Politique d'annulation">
              <label className="flex items-center gap-2 text-sm text-navy-700/80">
                <input
                  type="checkbox"
                  checked={form.cancellationFreeCancellation}
                  onChange={(e) => patch({ cancellationFreeCancellation: e.target.checked })}
                  className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                />
                Annulation gratuite
              </label>
              {form.cancellationFreeCancellation && (
                <div className="mt-2 max-w-xs">
                  <label className={labelClass}>Jusqu&apos;à combien d&apos;heures avant le départ</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.cancellationHoursBeforeDeadline ?? ""}
                    onChange={(e) => patch({ cancellationHoursBeforeDeadline: e.target.valueAsNumber || null })}
                  />
                </div>
              )}
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prix adulte (passager)" required>
              <input
                type="number"
                className={inputClass}
                value={form.passengerAdultPrice}
                onChange={(e) => patch({ passengerAdultPrice: e.target.valueAsNumber })}
              />
            </Field>
            <Field label="Prix enfant (passager)" required>
              <input
                type="number"
                className={inputClass}
                value={form.passengerChildPrice}
                onChange={(e) => patch({ passengerChildPrice: e.target.valueAsNumber })}
              />
            </Field>
            <Field label="Prix adulte (partenaire)" required>
              <input
                type="number"
                className={inputClass}
                value={form.partnerAdultPrice}
                onChange={(e) => patch({ partnerAdultPrice: e.target.valueAsNumber })}
              />
            </Field>
            <Field label="Prix enfant (partenaire)" required>
              <input
                type="number"
                className={inputClass}
                value={form.partnerChildPrice}
                onChange={(e) => patch({ partnerChildPrice: e.target.valueAsNumber })}
              />
            </Field>
            <Field label="TVA (%)" required>
              <input
                type="number"
                step={0.1}
                className={inputClass}
                value={form.tva}
                onChange={(e) => patch({ tva: e.target.valueAsNumber })}
              />
            </Field>
            <Field label="Statut">
              <label className="flex items-center gap-2 text-sm text-navy-700/80">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => patch({ isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                />
                Actif (visible et réservable)
              </label>
            </Field>
          </div>
        )}

        {step === 6 && (
          <TranslationsField
            translations={form.translations}
            onChange={(translations) => patch({ translations })}
          />
        )}

        {step === 7 && (
          <div className="flex flex-col gap-5">
            {!canSubmit && (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
                Le nom du tour est requis avant de pouvoir l&apos;enregistrer.
              </div>
            )}
            <PreviewCard form={form} />
            {error && (
              <div className="rounded-[10px] border border-rose/25 bg-rose/8 px-3 py-2.5 text-[13px] text-rose">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {isEdit && (
            <button type="button" onClick={() => setDeleteOpen(true)} className="btn btn-danger-outline">
              Supprimer
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => goTo(Math.max(0, step - 1))}
            disabled={step === 0}
            className="btn btn-secondary"
          >
            ← Précédent
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => goTo(step + 1)} className="btn btn-primary">
              Suivant →
            </button>
          ) : (
            <button type="button" onClick={onSubmit} disabled={busy} className="btn btn-primary">
              {busy ? "Enregistrement…" : isEdit ? "Enregistrer" : "Publier le tour"}
            </button>
          )}
        </div>
      </div>

      {deleteOpen && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteOpen(false)}>
          <p className="text-sm text-navy-700/80">Cette action est irréversible.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setDeleteOpen(false)} className="btn btn-secondary">
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

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>
        {label}
        {required && <span className="text-rose"> *</span>}
        {hint && <span className="ml-1 text-navy-700/35">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function PreviewCard({ form }: { form: TourForm }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-navy-700/10">
      <div className="aspect-video bg-navy-700/5">
        {form.coverPhotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.coverPhotoUrl} alt={form.name} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-navy-800">{form.name || "(sans nom)"}</h3>
        <p className="mt-1 text-sm text-navy-700/60">
          {form.duration} {form.location && `· ${form.location}`}
        </p>
        {form.description && <p className="mt-3 text-sm text-navy-700/80">{form.description}</p>}

        {form.highlights.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {form.highlights.map((h, i) => (
              <li key={i} className="rounded-full bg-gold/10 px-3 py-1 text-[12px] font-medium text-navy-800">
                ✦ {h}
              </li>
            ))}
          </ul>
        )}

        {form.programSteps.length > 0 && (
          <div className="mt-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-navy-700/40">Itinéraire</p>
            <ol className="mt-2 flex flex-col gap-2">
              {form.programSteps.map((s, i) => (
                <li key={i} className="text-sm">
                  <span className="font-semibold">{s.label || `Étape ${i + 1}`}</span>
                  {s.title && ` — ${s.title}`}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-navy-700/8 pt-4 text-sm">
          <div>
            <span className="text-navy-700/50">Adulte : </span>
            <span className="font-semibold">{form.passengerAdultPrice} TND</span>
          </div>
          <div>
            <span className="text-navy-700/50">Enfant : </span>
            <span className="font-semibold">{form.passengerChildPrice} TND</span>
          </div>
        </div>
      </div>
    </div>
  );
}
