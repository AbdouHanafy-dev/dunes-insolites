"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { inputClass, labelClass } from "@/components/payload/fields";
import RepeaterField from "@/components/payload/RepeaterField";
import CityChecklist from "@/components/payload/CityChecklist";
import ItineraryStepsField, { stepForSave, type ItineraryStep } from "@/components/tour-wizard/ItineraryStepsField";
import { ALL_CITIES } from "@/lib/cities";
import StringListField from "@/components/payload/StringListField";
import PhotoGalleryField, { type TourPhoto } from "./PhotoGalleryField";
import TranslationsField, {
  type CatalogTranslationForm,
  translationsToArray,
  translationsToRecord,
} from "@/components/payload/TranslationsField";
import type { AdminSpokenLanguage, AdminTour } from "@/lib/api";
import { MAX_TOUR_HOURS, MIN_TOUR_HOURS, tourDurationLabel, tourHoursError } from "@/lib/tourDuration";


type TourStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "REJECTED";
type GuideType = "NONE" | "TOUR_GUIDE" | "RECEPTION_STAFF" | "INSTRUCTOR" | "DRIVER";
type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
type MealFormat = "BUFFET" | "SET_MENU" | "ALA_CARTE" | "PICNIC";
type Meal = { mealType: MealType; format: MealFormat };

type TourForm = {
  name: string;
  slug: string;
  description: string;
  /** Raw input, so a half-typed value is not rewritten under the cursor. */
  durationHours: string;
  location: string;
  groupSizeType: string;
  aboutText: string;
  highlights: string[];
  includedItems: string[];
  notIncludedItems: string[];
  keywords: string[];
  programSteps: ItineraryStep[];
  departureCities: string[];
  returnCities: string[];
  guideType: GuideType;
  overnightsAtCamp: boolean;
  foodIncluded: boolean;
  meals: Meal[];
  drinksIncluded: boolean;
  dietaryRestrictions: string[];
  transportIncluded: boolean;
  transportModes: string[];
  notSuitableFor: string[];
  notAllowed: string[];
  animalsAccepted: boolean;
  petPolicyNote: string;
  mustBring: string[];
  goodToKnow: string;
  emergencyPhone: string;
  ticketInfo: string;
  meetingPoint: string;
  languageIds: string[];
  cancellationFreeCancellation: boolean;
  cancellationHoursBeforeDeadline: number | null;
  coverPhotoUrl: string | null;
  photos: TourPhoto[];
  translations: Record<string, CatalogTranslationForm>;
  passengerAdultPrice: number;
  salePriceAdult: number | null;
  passengerChildPrice: number;
  passengerInfantPrice: number;
  partnerAdultPrice: number;
  partnerChildPrice: number;
  tva: number;
  isActive: boolean;
  insuranceConfirmed: boolean;
  complianceConfirmed: boolean;
  copyrightConfirmed: boolean;
  status: TourStatus;
  rejectionReason: string | null;
};

const EMPTY_FORM: TourForm = {
  name: "",
  slug: "",
  description: "",
  durationHours: "",
  location: "",
  groupSizeType: "TOUTES_TAILLES",
  aboutText: "",
  highlights: [],
  includedItems: [],
  notIncludedItems: [],
  keywords: [],
  programSteps: [],
  departureCities: ALL_CITIES,
  returnCities: ALL_CITIES,
  guideType: "NONE",
  overnightsAtCamp: false,
  foodIncluded: false,
  meals: [],
  drinksIncluded: false,
  dietaryRestrictions: [],
  transportIncluded: false,
  transportModes: [],
  notSuitableFor: [],
  notAllowed: [],
  animalsAccepted: false,
  petPolicyNote: "",
  mustBring: [],
  goodToKnow: "",
  emergencyPhone: "",
  ticketInfo: "",
  meetingPoint: "",
  languageIds: [],
  cancellationFreeCancellation: false,
  cancellationHoursBeforeDeadline: null,
  coverPhotoUrl: null,
  photos: [],
  translations: {},
  passengerAdultPrice: 0,
  salePriceAdult: null,
  passengerChildPrice: 0,
  passengerInfantPrice: 0,
  partnerAdultPrice: 0,
  partnerChildPrice: 0,
  tva: 13,
  isActive: true,
  insuranceConfirmed: false,
  complianceConfirmed: false,
  copyrightConfirmed: false,
  status: "DRAFT",
  rejectionReason: null,
};

function fromInitialData(data?: AdminTour): TourForm {
  if (!data) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    name: data.name,
    slug: data.slug ?? "",
    description: data.description ?? "",
    durationHours: data.durationHours != null ? String(data.durationHours) : "",
    location: data.location ?? "",
    groupSizeType: data.groupSizeType ?? EMPTY_FORM.groupSizeType,
    aboutText: data.aboutText ?? "",
    highlights: data.highlights ?? [],
    includedItems: data.includedItems ?? [],
    notIncludedItems: data.notIncludedItems ?? [],
    keywords: data.keywords ?? [],
    programSteps: (data.programSteps ?? []).map((s) => ({
      label: s.label ?? "",
      title: s.title ?? "",
      description: s.description ?? "",
      segmentType: s.segmentType ?? "ACTIVITY",
      optionalSegment: s.optionalSegment ?? false,
      durationMinutes: s.durationMinutes ?? null,
      pickupPoint: s.pickupPoint ?? "",
      dropoffPoint: s.dropoffPoint ?? "",
      attraction: s.attraction ?? "",
      imageUrls: s.imageUrls ?? [],
    })),
    departureCities: data.departureCities ?? ALL_CITIES,
    returnCities: data.returnCities ?? ALL_CITIES,
    guideType: data.guideType ?? "NONE",
    overnightsAtCamp: data.overnightsAtCamp ?? false,
    foodIncluded: data.foodIncluded ?? false,
    meals: data.meals ?? [],
    drinksIncluded: data.drinksIncluded ?? false,
    dietaryRestrictions: data.dietaryRestrictions ?? [],
    transportIncluded: data.transportIncluded ?? false,
    transportModes: data.transportModes ?? [],
    notSuitableFor: data.notSuitableFor ?? [],
    notAllowed: data.notAllowed ?? [],
    animalsAccepted: data.animalsAccepted ?? false,
    petPolicyNote: data.petPolicyNote ?? "",
    mustBring: data.mustBring ?? [],
    goodToKnow: data.goodToKnow ?? "",
    emergencyPhone: data.emergencyPhone ?? "",
    ticketInfo: data.ticketInfo ?? "",
    meetingPoint: data.meetingPoint ?? "",
    languageIds: (data.languages ?? []).map((l) => l.languageId),
    cancellationFreeCancellation: data.cancellationPolicy?.freeCancellation ?? false,
    cancellationHoursBeforeDeadline: data.cancellationPolicy?.hoursBeforeDeadline ?? null,
    coverPhotoUrl: data.coverPhotoUrl ?? null,
    photos: data.photos ?? [],
    translations: translationsToRecord(data.translations),
    passengerAdultPrice: data.passengerAdultPrice,
    salePriceAdult: data.salePriceAdult ?? null,
    passengerChildPrice: data.passengerChildPrice,
    passengerInfantPrice: data.passengerInfantPrice ?? 0,
    partnerAdultPrice: data.partnerAdultPrice,
    partnerChildPrice: data.partnerChildPrice,
    tva: data.tva,
    isActive: data.isActive,
    insuranceConfirmed: data.insuranceConfirmed ?? false,
    complianceConfirmed: data.complianceConfirmed ?? false,
    copyrightConfirmed: data.copyrightConfirmed ?? false,
    status: data.status ?? "DRAFT",
    rejectionReason: data.rejectionReason ?? null,
  };
}

function toRequestBody(form: TourForm) {
  return {
    name: form.name,
    slug: form.slug || undefined,
    description: form.description || null,
    durationHours: form.durationHours.trim() === "" ? null : Number(form.durationHours),
    location: form.location || null,
    groupSizeType: form.groupSizeType || null,
    aboutText: form.aboutText || null,
    highlights: form.highlights,
    includedItems: form.includedItems,
    notIncludedItems: form.notIncludedItems,
    keywords: form.keywords,
    programSteps: form.programSteps.map((s, i) => stepForSave(s, i, form.programSteps.length)),
    departureCities: form.departureCities,
    returnCities: form.returnCities,
    guideType: form.guideType,
    overnightsAtCamp: form.overnightsAtCamp,
    foodIncluded: form.foodIncluded,
    meals: form.foodIncluded ? form.meals : [],
    drinksIncluded: form.foodIncluded ? form.drinksIncluded : false,
    dietaryRestrictions: form.foodIncluded ? form.dietaryRestrictions : [],
    transportIncluded: form.transportIncluded,
    transportModes: form.transportIncluded ? form.transportModes : [],
    notSuitableFor: form.notSuitableFor,
    notAllowed: form.notAllowed,
    animalsAccepted: form.animalsAccepted,
    petPolicyNote: form.petPolicyNote || null,
    mustBring: form.mustBring,
    goodToKnow: form.goodToKnow || null,
    emergencyPhone: form.emergencyPhone || null,
    ticketInfo: form.ticketInfo || null,
    meetingPoint: form.meetingPoint || null,
    languageIds: form.languageIds,
    cancellationPolicy: {
      freeCancellation: form.cancellationFreeCancellation,
      hoursBeforeDeadline: form.cancellationHoursBeforeDeadline,
    },
    coverPhotoUrl: form.coverPhotoUrl,
    photos: form.photos,
    translations: translationsToArray(form.translations),
    passengerAdultPrice: form.passengerAdultPrice,
    salePriceAdult: form.salePriceAdult,
    passengerChildPrice: form.passengerChildPrice,
    passengerInfantPrice: form.passengerInfantPrice,
    partnerAdultPrice: form.partnerAdultPrice,
    partnerChildPrice: form.partnerChildPrice,
    tva: form.tva,
    isActive: form.isActive,
    insuranceConfirmed: form.insuranceConfirmed,
    complianceConfirmed: form.complianceConfirmed,
    copyrightConfirmed: form.copyrightConfirmed,
  };
}

const GROUP_SIZE_OPTIONS = [
  { value: "PETIT_GROUPE", label: "Petit groupe" },
  { value: "GROUPE_MOYEN", label: "Groupe moyen" },
  { value: "TOUTES_TAILLES", label: "Toutes tailles" },
  { value: "PRIVATIF", label: "Privatif" },
];

const GUIDE_TYPE_OPTIONS: { value: GuideType; label: string }[] = [
  { value: "NONE", label: "Personne (autonome)" },
  { value: "TOUR_GUIDE", label: "Guide touristique" },
  { value: "RECEPTION_STAFF", label: "Personnel d'accueil" },
  { value: "INSTRUCTOR", label: "Moniteur·rice" },
  { value: "DRIVER", label: "Chauffeur·e" },
];

const MEAL_TYPE_OPTIONS = [
  { value: "BREAKFAST", label: "Petit-déjeuner" },
  { value: "LUNCH", label: "Déjeuner" },
  { value: "DINNER", label: "Dîner" },
  { value: "SNACK", label: "Collation" },
];

const MEAL_FORMAT_OPTIONS = [
  { value: "BUFFET", label: "Buffet" },
  { value: "SET_MENU", label: "Menu fixe" },
  { value: "ALA_CARTE", label: "À la carte" },
  { value: "PICNIC", label: "Pique-nique" },
];

const STEPS = [
  "Informations de base",
  "Photos",
  "Itinéraire",
  "Mots-clés",
  "Points forts & inclusions",
  "Guide, repas & transport",
  "Infos supplémentaires",
  "Logistique",
  "Tarifs",
  "Traductions",
  "Vérification",
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
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [languages, setLanguages] = useState<AdminSpokenLanguage[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/languages")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => !cancelled && setLanguages(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function patch(fields: Partial<TourForm>) {
    setForm((s) => ({ ...s, ...fields }));
  }

  function goTo(next: number) {
    setStep(next);
    setVisited((v) => new Set(v).add(next));
  }

  const durationError = tourHoursError(form.durationHours);
  const basicsValid = form.name.trim().length > 0 && durationError === null && form.departureCities.length > 0;
  const salePriceValid = form.salePriceAdult == null || form.salePriceAdult < form.passengerAdultPrice;
  const pricingValid =
    form.passengerAdultPrice >= 0 &&
    form.passengerChildPrice >= 0 &&
    form.passengerInfantPrice >= 0 &&
    form.partnerAdultPrice >= 0 &&
    form.partnerChildPrice >= 0 &&
    salePriceValid;
  const photosValid = form.photos.length + (form.coverPhotoUrl ? 1 : 0) >= 4 && form.copyrightConfirmed;
  const itineraryValid = form.programSteps.length >= 1;
  const keywordsValid = form.keywords.length >= 1;
  const verificationValid = form.insuranceConfirmed && form.complianceConfirmed;
  const canSubmit = basicsValid && pricingValid;
  const readyForReview =
    basicsValid && pricingValid && photosValid && itineraryValid && keywordsValid && verificationValid;

  function sectionValid(i: number): boolean {
    switch (STEPS[i]) {
      case "Informations de base":
        return basicsValid;
      case "Photos":
        return photosValid;
      case "Itinéraire":
        return itineraryValid;
      case "Mots-clés":
        return keywordsValid;
      case "Tarifs":
        return pricingValid;
      case "Vérification":
        return readyForReview;
      default:
        return true;
    }
  }

  async function onSubmit() {
    if (!canSubmit) {
      setStep(0);
      toast.error("Le nom du circuit est requis avant de pouvoir l'enregistrer.");
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
    toast.success(isEdit ? "Circuit modifié avec succès" : "Circuit créé avec succès");
    router.push("/catalogue/tours");
    router.refresh();
  }

  async function onDelete() {
    if (!id) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/tours/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Suppression impossible — ce circuit est peut-être référencé ailleurs.");
      setDeleteOpen(false);
      return;
    }
    toast.success("Supprimé avec succès");
    router.push("/catalogue/tours");
    router.refresh();
  }

  async function callStatusAction(path: string, body?: unknown) {
    if (!id) return;
    setBusy(true);
    const res = await fetch(`/api/proxy/tours/${id}/${path}`, {
      method: "PATCH",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.message ?? data.error ?? "Une erreur est survenue.");
      return;
    }
    const updated: AdminTour = await res.json();
    setForm((s) => ({ ...s, status: updated.status, rejectionReason: updated.rejectionReason, isActive: updated.isActive }));
    return updated;
  }

  async function onSubmitForReview() {
    if (!readyForReview) {
      toast.error("Toutes les sections doivent être complètes avant l'envoi en vérification.");
      return;
    }
    const updated = await callStatusAction("submit-for-review");
    if (updated) toast.success("Circuit envoyé pour vérification.");
  }

  async function onApprove() {
    const updated = await callStatusAction("approve");
    if (updated) toast.success("Circuit approuvé et publié.");
  }

  async function onReject() {
    if (!rejectReason.trim()) {
      toast.error("Un motif de rejet est requis.");
      return;
    }
    const updated = await callStatusAction("reject", { reason: rejectReason.trim() });
    if (updated) {
      toast.success("Circuit rejeté.");
      setRejectOpen(false);
      setRejectReason("");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/catalogue/tours" className="text-sm text-navy-700/50 hover:underline">
          ← Circuits
        </Link>
        <h1 className="mt-1 text-xl font-bold text-navy-800">
          {isEdit ? form.name || "Modifier" : "Nouveau circuit"}
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
            {visited.has(i) && sectionValid(i) && <span className="ml-1 text-emerald-600">✓</span>}
          </button>
        ))}
      </div>

      <div className="card rounded-2xl p-6">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <Field label="Nom du circuit" required>
              <input className={inputClass} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Slug (URL)">
              <input className={inputClass} value={form.slug} onChange={(e) => patch({ slug: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Durée (heures)"
                required
                hint={
                  durationError === null
                    ? `Affichée « ${tourDurationLabel(Number(form.durationHours))} » sur le site`
                    : "Nombre entier d'heures, 24 h = 1 jour"
                }
              >
                <input
                  className={inputClass}
                  type="number"
                  inputMode="numeric"
                  min={MIN_TOUR_HOURS}
                  max={MAX_TOUR_HOURS}
                  step={1}
                  value={form.durationHours}
                  onChange={(e) => patch({ durationHours: e.target.value })}
                  aria-invalid={form.durationHours !== "" && durationError !== null}
                />
                {form.durationHours !== "" && durationError !== null && (
                  <p className="mt-1 text-[12px] font-semibold text-red-600">{durationError}</p>
                )}
              </Field>
              <Field label="Lieu / région" hint="Affiché sur la page du circuit, utilisé pour la carte et la recherche">
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
            <Field label="Villes de départ proposées" required hint="Seules les villes cochées apparaissent à l'étape « lieu de départ » de la réservation">
              <CityChecklist required value={form.departureCities} onChange={(departureCities) => patch({ departureCities })} />
            </Field>
            <Field label="Villes de retour proposées" hint="Seules les villes cochées apparaissent à l'étape « lieu de retour ». Aucune cochée : la question n'est pas posée.">
              <CityChecklist value={form.returnCities} onChange={(returnCities) => patch({ returnCities })} />
            </Field>
            <Field label="Nuit au camp de Sabria">
              <label className="flex items-start gap-2 text-sm text-navy-700/80">
                <input
                  type="checkbox"
                  checked={form.overnightsAtCamp}
                  onChange={(e) => patch({ overnightsAtCamp: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                />
                <span>
                  Ce circuit passe une nuit au camp. Le client devra choisir un hébergement
                  (Tente, Chambre ou Suite) et le nombre d&apos;unités lors de la réservation.
                </span>
              </label>
            </Field>
            <Field label="Description courte" hint="Affichée dans les listes et cartes">
              <textarea
                className={`${inputClass} min-h-24`}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
            <Field label="Présentation détaillée" hint="Affichée sur la page du circuit">
              <textarea
                className={`${inputClass} min-h-32`}
                value={form.aboutText}
                onChange={(e) => patch({ aboutText: e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <PhotoGalleryField
              coverPhotoUrl={form.coverPhotoUrl}
              onCoverChange={(url) => patch({ coverPhotoUrl: url })}
              photos={form.photos}
              onPhotosChange={(photos) => patch({ photos })}
            />
            <p className="text-[13px] text-navy-700/55">
              {form.photos.length + (form.coverPhotoUrl ? 1 : 0)} / 4 photos minimum (couverture incluse)
            </p>
            <label className="flex items-center gap-2 text-sm text-navy-700/80">
              <input
                type="checkbox"
                checked={form.copyrightConfirmed}
                onChange={(e) => patch({ copyrightConfirmed: e.target.checked })}
                className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
              />
              Je confirme détenir les droits sur ces photos (droit à l&apos;image, pas de marque tierce).
            </label>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-[13px] text-navy-700/55">
              Le programme jour par jour (ou étape par étape) que verra le client.
            </p>
            <ItineraryStepsField
              steps={form.programSteps}
              onChange={(programSteps) => patch({ programSteps })}
            />
          </div>
        )}

        {step === 3 && (
          <Field label="Mots-clés" hint="Pour la recherche et le référencement — au moins un requis">
            <StringListField
              items={form.keywords}
              onChange={(keywords) => patch({ keywords })}
              placeholder="ex. désert, camping, coucher de soleil"
            />
          </Field>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-6">
            <Field label="Points forts" hint="Ce qui rend ce circuit unique">
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

        {step === 5 && (
          <div className="flex flex-col gap-6">
            <Field label="Qui guide les clients ?">
              <select
                className={inputClass}
                value={form.guideType}
                onChange={(e) => patch({ guideType: e.target.value as GuideType })}
              >
                {GUIDE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {form.guideType === "TOUR_GUIDE" && (
                <p className="mt-1 text-[13px] text-navy-700/45">
                  Les langues parlées se définissent dans l&apos;étape Logistique.
                </p>
              )}
            </Field>

            <Field label="Repas inclus ?">
              <label className="flex items-center gap-2 text-sm text-navy-700/80">
                <input
                  type="checkbox"
                  checked={form.foodIncluded}
                  onChange={(e) => patch({ foodIncluded: e.target.checked })}
                  className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                />
                Nourriture incluse
              </label>
              {form.foodIncluded && (
                <div className="mt-3 flex flex-col gap-3">
                  <RepeaterField
                    itemLabel="Repas"
                    items={form.meals as unknown as Record<string, unknown>[]}
                    onChange={(items) => patch({ meals: items as unknown as Meal[] })}
                    fields={[
                      { type: "select", key: "mealType", label: "Type de repas", options: MEAL_TYPE_OPTIONS },
                      { type: "select", key: "format", label: "Format", options: MEAL_FORMAT_OPTIONS },
                    ]}
                  />
                  <label className="flex items-center gap-2 text-sm text-navy-700/80">
                    <input
                      type="checkbox"
                      checked={form.drinksIncluded}
                      onChange={(e) => patch({ drinksIncluded: e.target.checked })}
                      className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                    />
                    Boissons incluses
                  </label>
                  <Field label="Restrictions alimentaires">
                    <StringListField
                      items={form.dietaryRestrictions}
                      onChange={(dietaryRestrictions) => patch({ dietaryRestrictions })}
                      placeholder="ex. végétarien, sans gluten"
                    />
                  </Field>
                </div>
              )}
            </Field>

            <Field label="Transport fourni pendant l'activité ?" hint="Le transport aller-retour se définit à l'étape Logistique">
              <label className="flex items-center gap-2 text-sm text-navy-700/80">
                <input
                  type="checkbox"
                  checked={form.transportIncluded}
                  onChange={(e) => patch({ transportIncluded: e.target.checked })}
                  className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                />
                Transport pendant l&apos;activité
              </label>
              {form.transportIncluded && (
                <div className="mt-3">
                  <StringListField
                    items={form.transportModes}
                    onChange={(transportModes) => patch({ transportModes })}
                    placeholder="ex. vélo, bus, 4x4, chameau"
                  />
                </div>
              )}
            </Field>
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col gap-6">
            <Field label="Non adapté pour" hint="ex. femmes enceintes, moins de 18 ans">
              <StringListField
                items={form.notSuitableFor}
                onChange={(notSuitableFor) => patch({ notSuitableFor })}
                placeholder="ex. femmes enceintes"
              />
            </Field>

            <Field label="Non autorisé" hint="ex. tongs, appareil photo">
              <StringListField
                items={form.notAllowed}
                onChange={(notAllowed) => patch({ notAllowed })}
                placeholder="ex. tongs"
              />
            </Field>

            <Field label="Animaux">
              <label className="flex items-center gap-2 text-sm text-navy-700/80">
                <input
                  type="checkbox"
                  checked={form.animalsAccepted}
                  onChange={(e) => patch({ animalsAccepted: e.target.checked })}
                  className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                />
                Animaux acceptés
              </label>
              <div className="mt-2">
                <input
                  className={inputClass}
                  placeholder="Précisions (optionnel)"
                  value={form.petPolicyNote}
                  onChange={(e) => patch({ petPolicyNote: e.target.value })}
                />
              </div>
            </Field>

            <Field label="À apporter" hint="ex. serviette, chaussures fermées">
              <StringListField
                items={form.mustBring}
                onChange={(mustBring) => patch({ mustBring })}
                placeholder="ex. serviette"
              />
            </Field>

            <Field label="Bon à savoir" hint="max 1000 caractères">
              <textarea
                className={`${inputClass} min-h-24`}
                maxLength={1000}
                value={form.goodToKnow}
                onChange={(e) => patch({ goodToKnow: e.target.value })}
              />
            </Field>

            <Field label="Numéro d'urgence">
              <input
                className={inputClass}
                value={form.emergencyPhone}
                onChange={(e) => patch({ emergencyPhone: e.target.value })}
                placeholder="+216 XX XXX XXX"
              />
            </Field>

            <Field label="Informations à afficher sur le billet">
              <textarea
                className={`${inputClass} min-h-20`}
                value={form.ticketInfo}
                onChange={(e) => patch({ ticketInfo: e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 7 && (
          <div className="flex flex-col gap-5">
            <Field label="Point de rendez-vous">
              <input
                className={inputClass}
                value={form.meetingPoint}
                onChange={(e) => patch({ meetingPoint: e.target.value })}
              />
            </Field>
            <Field label="Langues parlées">
              <div className="flex flex-wrap gap-4">
                {languages.length === 0 && (
                  <p className="text-[13px] text-navy-700/45">
                    Aucune langue configurée — gérez la liste sous Catalogue → Langues.
                  </p>
                )}
                {languages.map((o) => (
                  <label key={o.languageId} className="flex items-center gap-2 text-sm text-navy-700/80">
                    <input
                      type="checkbox"
                      checked={form.languageIds.includes(o.languageId)}
                      onChange={(e) =>
                        patch({
                          languageIds: e.target.checked
                            ? [...form.languageIds, o.languageId]
                            : form.languageIds.filter((l) => l !== o.languageId),
                        })
                      }
                      className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                    />
                    {o.name}
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

        {step === 8 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prix adulte (passager)" required>
              <input
                type="number"
                className={inputClass}
                value={form.passengerAdultPrice}
                onChange={(e) => patch({ passengerAdultPrice: e.target.valueAsNumber })}
              />
            </Field>
            <Field
              label="Prix promotionnel adulte"
              hint="optionnel — doit être inférieur au prix normal pour afficher une réduction"
            >
              <input
                type="number"
                className={inputClass}
                value={form.salePriceAdult ?? ""}
                onChange={(e) => patch({ salePriceAdult: e.target.valueAsNumber || null })}
              />
              {form.salePriceAdult != null && !salePriceValid && (
                <p className="mt-1 text-[12px] text-rose">
                  Le prix promotionnel doit être inférieur au prix adulte normal.
                </p>
              )}
            </Field>
            <Field label="Prix enfant, 3 à 18 ans (passager)" required>
              <input
                type="number"
                className={inputClass}
                value={form.passengerChildPrice}
                onChange={(e) => patch({ passengerChildPrice: e.target.valueAsNumber })}
              />
            </Field>
            <Field label="Prix bébé, 0 à 3 ans (passager)" required hint="0 = gratuit">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.passengerInfantPrice}
                onChange={(e) => patch({ passengerInfantPrice: e.target.valueAsNumber })}
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

        {step === 9 && (
          <TranslationsField
            positionalSteps
            translations={form.translations}
            onChange={(translations) => patch({ translations })}
          />
        )}

        {step === 10 && (
          <div className="flex flex-col gap-5">
            {!canSubmit && (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
                Le nom du circuit est requis avant de pouvoir l&apos;enregistrer.
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-navy-700/70">Statut :</span>
              <StatusBadge status={form.status} />
            </div>

            {form.status === "REJECTED" && form.rejectionReason && (
              <div className="rounded-lg bg-rose/8 px-3 py-2 text-[13px] text-rose">
                Motif du rejet : {form.rejectionReason}
              </div>
            )}

            <div className="rounded-xl border border-navy-700/10 p-4">
              <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-navy-700/40">
                Complétude
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                <ChecklistItem ok={basicsValid} label="Informations de base" />
                <ChecklistItem ok={keywordsValid} label="Au moins un mot-clé" />
                <ChecklistItem ok={itineraryValid} label="Au moins une étape d'itinéraire" />
                <ChecklistItem ok={photosValid} label="Au moins 4 photos et droits confirmés" />
                <ChecklistItem ok={pricingValid} label="Tarifs" />
                <ChecklistItem ok={form.insuranceConfirmed} label="Assurance responsabilité civile confirmée" />
                <ChecklistItem ok={form.complianceConfirmed} label="Conformité réglementaire confirmée" />
              </ul>
            </div>

            <Field label="Vérifications finales">
              <label className="flex items-center gap-2 text-sm text-navy-700/80">
                <input
                  type="checkbox"
                  checked={form.insuranceConfirmed}
                  onChange={(e) => patch({ insuranceConfirmed: e.target.checked })}
                  className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                />
                J&apos;atteste que ce circuit est couvert par une assurance responsabilité civile.
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-navy-700/80">
                <input
                  type="checkbox"
                  checked={form.complianceConfirmed}
                  onChange={(e) => patch({ complianceConfirmed: e.target.checked })}
                  className="h-4 w-4 rounded border-navy-700/25 text-gold focus:ring-gold/30"
                />
                J&apos;atteste que ce circuit respecte la réglementation en vigueur.
              </label>
            </Field>

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
            <>
              <button type="button" onClick={onSubmit} disabled={busy} className="btn btn-secondary">
                {busy ? "Enregistrement…" : "Enregistrer"}
              </button>
              {isEdit && (form.status === "DRAFT" || form.status === "REJECTED") && (
                <button
                  type="button"
                  onClick={onSubmitForReview}
                  disabled={busy || !readyForReview}
                  className="btn btn-primary"
                  title={readyForReview ? undefined : "Complétez toutes les sections requises d'abord."}
                >
                  Envoyer pour vérification
                </button>
              )}
              {isEdit && form.status === "IN_REVIEW" && (
                <>
                  <button type="button" onClick={() => setRejectOpen(true)} disabled={busy} className="btn btn-danger-outline">
                    Rejeter
                  </button>
                  <button type="button" onClick={onApprove} disabled={busy} className="btn btn-primary">
                    Approuver
                  </button>
                </>
              )}
            </>
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

      {rejectOpen && (
        <Modal title="Rejeter ce circuit" onClose={() => setRejectOpen(false)}>
          <Field label="Motif du rejet" required>
            <textarea
              className={`${inputClass} min-h-24`}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setRejectOpen(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={onReject} disabled={busy} className="btn btn-danger">
              {busy ? "Envoi…" : "Rejeter"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TourStatus }) {
  const styles: Record<TourStatus, string> = {
    DRAFT: "bg-navy-700/8 text-navy-700/60",
    IN_REVIEW: "bg-amber-50 text-amber-800",
    PUBLISHED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-rose/8 text-rose",
  };
  const labels: Record<TourStatus, string> = {
    DRAFT: "Brouillon",
    IN_REVIEW: "En cours de vérification",
    PUBLISHED: "Publié",
    REJECTED: "Rejeté",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${styles[status]}`}>{labels[status]}</span>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={ok ? "text-emerald-600" : "text-navy-700/30"}>{ok ? "✓" : "○"}</span>
      <span className={ok ? "text-navy-700/80" : "text-navy-700/50"}>{label}</span>
    </li>
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
          {tourHoursError(form.durationHours) === null && tourDurationLabel(Number(form.durationHours))} {form.location && `· ${form.location}`}
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
            {form.salePriceAdult != null && form.salePriceAdult < form.passengerAdultPrice ? (
              <>
                <span className="text-navy-700/40 line-through">{form.passengerAdultPrice} €</span>{" "}
                <span className="font-semibold text-rose">{form.salePriceAdult} €</span>
              </>
            ) : (
              <span className="font-semibold">{form.passengerAdultPrice} €</span>
            )}
          </div>
          <div>
            <span className="text-navy-700/50">Enfant : </span>
            <span className="font-semibold">{form.passengerChildPrice} €</span>
          </div>
          <div>
            <span className="text-navy-700/50">Bébé : </span>
            <span className="font-semibold">{form.passengerInfantPrice > 0 ? `${form.passengerInfantPrice} €` : "gratuit"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
