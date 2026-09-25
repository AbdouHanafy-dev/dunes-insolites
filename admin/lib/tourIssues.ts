/**
 * Exact, per-field problems for the circuit wizard. Two sources feed the same
 * list so the operator sees one consistent thing:
 *  - `localIssues`: what the form can already tell is wrong before any request;
 *  - `serverIssues`: the backend's own `errors` map, with each raw field path
 *    ("programSteps[2].title") turned into a readable label and pinned to the
 *    wizard step where that field lives.
 */
export type Issue = {
  /** Wizard step index (0-based) the field lives on; -1 when unknown. */
  step: number;
  /** Form key or backend path, used to show the message under its input. */
  field: string;
  /** Human label of the field, e.g. "Prix adulte (passager)". */
  label: string;
  /** What is wrong with it. */
  message: string;
};

export type TourIssueInput = {
  name: string;
  photos: unknown[];
  coverPhotoUrl: string | null;
  copyrightConfirmed: boolean;
  programSteps: unknown[];
  keywords: string[];
  passengerAdultPrice: number;
  salePriceAdult: number | null;
  passengerChildPrice: number;
  passengerInfantPrice: number;
  partnerAdultPrice: number;
  partnerChildPrice: number;
  tva: number;
  insuranceConfirmed: boolean;
  complianceConfirmed: boolean;
};

export const STEP_BASICS = 0;
export const STEP_PHOTOS = 1;
export const STEP_ITINERARY = 2;
export const STEP_KEYWORDS = 3;
export const STEP_PRICING = 8;
export const STEP_REVIEW = 10;

/** Steps whose problems stop a plain "Enregistrer" (the rest only block review). */
export const SAVE_BLOCKING_STEPS: readonly number[] = [STEP_BASICS, STEP_PRICING];

const PRICE_FIELDS: [keyof TourIssueInput, string][] = [
  ["passengerAdultPrice", "Prix adulte (passager)"],
  ["passengerChildPrice", "Prix enfant (passager)"],
  ["passengerInfantPrice", "Prix bébé (passager)"],
  ["partnerAdultPrice", "Prix adulte (partenaire)"],
  ["partnerChildPrice", "Prix enfant (partenaire)"],
  ["tva", "TVA (%)"],
];

const MIN_PHOTOS = 4;

export function localIssues(f: TourIssueInput): Issue[] {
  const out: Issue[] = [];
  const add = (step: number, field: string, label: string, message: string) =>
    out.push({ step, field, label, message });

  if (f.name.trim().length === 0) add(STEP_BASICS, "name", "Nom du circuit", "requis — saisissez le nom du circuit.");

  for (const [key, label] of PRICE_FIELDS) {
    const value = f[key] as number;
    if (!Number.isFinite(value)) add(STEP_PRICING, key, label, "saisissez un nombre (le champ est vide ou invalide).");
    else if (value < 0) add(STEP_PRICING, key, label, `ne peut pas être négatif (saisi : ${value}).`);
  }
  if (
    f.salePriceAdult != null &&
    Number.isFinite(f.salePriceAdult) &&
    Number.isFinite(f.passengerAdultPrice) &&
    f.salePriceAdult >= f.passengerAdultPrice
  ) {
    add(
      STEP_PRICING,
      "salePriceAdult",
      "Prix promotionnel adulte",
      `doit être inférieur au prix adulte (promo ${f.salePriceAdult} ≥ prix adulte ${f.passengerAdultPrice}).`,
    );
  }

  const photoCount = f.photos.length + (f.coverPhotoUrl ? 1 : 0);
  if (photoCount < MIN_PHOTOS) {
    add(
      STEP_PHOTOS,
      "photos",
      "Photos",
      `${photoCount} photo(s) sur ${MIN_PHOTOS} minimum (couverture + galerie) — il en manque ${MIN_PHOTOS - photoCount}.`,
    );
  }
  if (!f.copyrightConfirmed) {
    add(STEP_PHOTOS, "copyrightConfirmed", "Droits des photos", "à confirmer — cochez que vous détenez les droits.");
  }

  if (f.programSteps.length === 0) {
    add(STEP_ITINERARY, "programSteps", "Itinéraire", "ajoutez au moins une étape (aucune pour l'instant).");
  }
  if (f.keywords.length === 0) {
    add(STEP_KEYWORDS, "keywords", "Mots-clés", "ajoutez au moins un mot-clé (aucun pour l'instant).");
  }
  if (!f.insuranceConfirmed) {
    add(STEP_REVIEW, "insuranceConfirmed", "Assurance", "à confirmer — cochez l'attestation de responsabilité civile.");
  }
  if (!f.complianceConfirmed) {
    add(STEP_REVIEW, "complianceConfirmed", "Conformité", "à confirmer — cochez l'attestation de conformité réglementaire.");
  }
  return out;
}

/* ---------------------------------------------------------------- server */

const FIELD_STEP: Record<string, number> = {
  name: 0, slug: 0, description: 0, duration: 0, location: 0, groupSizeType: 0, aboutText: 0, overnightsAtCamp: 0,
  photos: 1, coverPhotoUrl: 1, copyrightConfirmed: 1,
  programSteps: 2,
  keywords: 3,
  highlights: 4, includedItems: 4, notIncludedItems: 4,
  guideType: 5, foodIncluded: 5, meals: 5, drinksIncluded: 5, dietaryRestrictions: 5, transportIncluded: 5, transportModes: 5,
  notSuitableFor: 6, notAllowed: 6, animalsAccepted: 6, petPolicyNote: 6, mustBring: 6, goodToKnow: 6,
  emergencyPhone: 6, ticketInfo: 6, languageIds: 6,
  meetingPoint: 7, cancellationPolicy: 7,
  passengerAdultPrice: 8, salePriceAdult: 8, passengerChildPrice: 8, passengerInfantPrice: 8,
  partnerAdultPrice: 8, partnerChildPrice: 8, tva: 8, isActive: 8,
  translations: 9,
  insuranceConfirmed: 10, complianceConfirmed: 10,
};

const FIELD_LABEL: Record<string, string> = {
  name: "Nom du circuit", slug: "Slug (URL)", description: "Description courte", duration: "Durée",
  location: "Lieu de départ", groupSizeType: "Taille de groupe", aboutText: "Présentation détaillée",
  overnightsAtCamp: "Nuit au camp",
  photos: "Photos", coverPhotoUrl: "Photo de couverture", copyrightConfirmed: "Droits des photos",
  programSteps: "Itinéraire", keywords: "Mots-clés",
  highlights: "Points forts", includedItems: "Inclus", notIncludedItems: "Non inclus",
  guideType: "Type de guide", foodIncluded: "Repas inclus", meals: "Repas", drinksIncluded: "Boissons incluses",
  dietaryRestrictions: "Régimes alimentaires", transportIncluded: "Transport inclus", transportModes: "Modes de transport",
  notSuitableFor: "Non adapté à", notAllowed: "Interdit", animalsAccepted: "Animaux acceptés",
  petPolicyNote: "Règle animaux", mustBring: "À apporter", goodToKnow: "Bon à savoir",
  emergencyPhone: "Téléphone d'urgence", ticketInfo: "Billets", languageIds: "Langues",
  meetingPoint: "Point de rendez-vous", cancellationPolicy: "Politique d'annulation",
  passengerAdultPrice: "Prix adulte (passager)", salePriceAdult: "Prix promotionnel adulte",
  passengerChildPrice: "Prix enfant (passager)", passengerInfantPrice: "Prix bébé (passager)",
  partnerAdultPrice: "Prix adulte (partenaire)", partnerChildPrice: "Prix enfant (partenaire)",
  tva: "TVA (%)", isActive: "Statut actif", translations: "Traductions",
  insuranceConfirmed: "Assurance", complianceConfirmed: "Conformité",
};

const SUB_LABEL: Record<string, string> = {
  label: "horaire / libellé", title: "titre", description: "description", segmentType: "type de segment",
  durationMinutes: "durée (minutes)", name: "nom", aboutText: "présentation", locale: "langue",
  url: "adresse de la photo", caption: "légende", freeCancellation: "annulation gratuite",
  hoursBeforeDeadline: "délai (heures)",
  tourTypeId: "nuitée", accommodationTypeId: "type d'hébergement", accommodationUnits: "unités",
  activityDate: "date", extraId: "activité", quantity: "quantité", tourId: "circuit",
};

/** "programSteps[2].title" + root label -> "Itinéraire, étape 3 — titre" (shared by every admin form). */
export function formatPath(path: string, rootLabel: string): { base: string; label: string } {
  const m = /^([A-Za-z0-9_]+)(?:\[(\d+)\])?(?:\.([A-Za-z0-9_]+))?/.exec(path);
  if (!m) return { base: path, label: path };
  const [, base, index, sub] = m;
  const n = index === undefined ? null : Number(index) + 1;
  let label = rootLabel;
  if (base === "programSteps" && n !== null) label = `Itinéraire, étape ${n}`;
  else if (base === "translations" && n !== null) label = `Traduction n° ${n}`;
  else if (base === "photos" && n !== null) label = `Photo n° ${n}`;
  else if (n !== null) label = `${rootLabel}, élément n° ${n}`;
  if (sub) label += ` — ${SUB_LABEL[sub] ?? sub}`;
  return { base, label };
}

export function describePath(path: string): { base: string; label: string } {
  const base = /^[A-Za-z0-9_]+/.exec(path)?.[0] ?? path;
  return formatPath(path, FIELD_LABEL[base] ?? base);
}

export function serverIssues(fields: Record<string, string>, fallbackMessage: string): Issue[] {
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    return [{ step: -1, field: "", label: "Serveur", message: fallbackMessage }];
  }
  return entries.map(([path, reason]) => {
    const { base, label } = describePath(path);
    return { step: FIELD_STEP[base] ?? -1, field: path, label, message: reason };
  });
}

export function summarizeIssues(issues: Issue[], stepNames: readonly string[], max = 4): string {
  const shown = issues.slice(0, max).map((i) => {
    const where = i.step >= 0 ? `[${i.step + 1}. ${stepNames[i.step]}] ` : "";
    return `${where}${i.label} : ${i.message}`;
  });
  const rest = issues.length - shown.length;
  return shown.join(" · ") + (rest > 0 ? ` · … et ${rest} autre(s)` : "");
}
