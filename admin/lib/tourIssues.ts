import { tourHoursError } from "./tourDuration";

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
  /** True when this stops a plain save (the rest only block "send for review"). */
  blocking?: boolean;
};

export type TourIssueInput = {
  name: string;
  description: string;
  /** Raw hours input. */
  durationHours: string;
  departureCities: string[];
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

/** Problems that stop a plain "Enregistrer" (the others only block "Envoyer pour vérification"). */
export const isSaveBlocking = (i: Issue): boolean => i.blocking === true;

const PRICE_FIELDS: [keyof TourIssueInput, string][] = [
  ["passengerAdultPrice", "Prix adulte (passager)"],
  ["passengerChildPrice", "Prix enfant (passager)"],
  ["passengerInfantPrice", "Prix bébé (passager)"],
  ["partnerAdultPrice", "Prix adulte (partenaire)"],
  ["partnerChildPrice", "Prix enfant (partenaire)"],
  ["tva", "TVA (%)"],
];

export function localIssues(f: TourIssueInput): Issue[] {
  const out: Issue[] = [];
  const add = (step: number, field: string, label: string, message: string, blocking = false) =>
    out.push({ step, field, label, message, blocking });

  if (f.name.trim().length === 0) {
    add(STEP_BASICS, "name", "Nom du circuit", "requis — saisissez le nom du circuit.", true);
  }
  const hoursError = tourHoursError(f.durationHours);
  if (hoursError !== null) {
    add(STEP_BASICS, "durationHours", "Durée (heures)", hoursError, true);
  }
  if (f.departureCities.length === 0) {
    add(STEP_BASICS, "departureCities", "Villes de départ", "cochez au moins une ville de départ.", true);
  }
  // The server refuses to send a circuit for review without a description.
  if (f.description.trim().length === 0) {
    add(STEP_BASICS, "description", "Description courte", "requise pour l'envoi en vérification — elle est vide.");
  }

  for (const [key, label] of PRICE_FIELDS) {
    const value = f[key] as number;
    if (!Number.isFinite(value)) add(STEP_PRICING, key, label, "saisissez un nombre (le champ est vide ou invalide).", true);
    else if (value < 0) add(STEP_PRICING, key, label, `ne peut pas être négatif (saisi : ${value}).`, true);
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
      true,
    );
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
  name: 0, slug: 0, description: 0, durationHours: 0, departureCities: 0, returnCities: 0, location: 0, groupSizeType: 0, aboutText: 0, overnightsAtCamp: 0,
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
  name: "Nom du circuit", slug: "Slug (URL)", description: "Description courte", durationHours: "Durée (heures)",
  departureCities: "Villes de départ", returnCities: "Villes de retour",
  location: "Lieu / région", groupSizeType: "Taille de groupe", aboutText: "Présentation détaillée",
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
  durationMinutes: "durée (minutes)", pickupPoint: "lieu de prise en charge", dropoffPoint: "lieu de dépose",
  attraction: "attraction", imageUrls: "images", name: "nom", aboutText: "présentation", locale: "langue",
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

/**
 * A database constraint (duplicate slug, missing column) comes back with no
 * per-field map — only a sentence naming the COLUMN, e.g.
 * "Another record already uses the same value for: slug." (409) or
 * "A required value is missing: cover_photo_url." (400). Read the column out so
 * the problem can still be pinned to its field.
 */
export function parseConstraintMessage(message: string): { kind: "duplicate" | "missing"; columns: string[] } | null {
  const dup = /same value for:\s*([A-Za-z0-9_,\s]+?)\./.exec(message);
  if (dup) return { kind: "duplicate", columns: dup[1].split(",").map((c) => c.trim()).filter(Boolean) };
  const missing = /required value is missing:\s*([A-Za-z0-9_]+)\./.exec(message);
  if (missing) return { kind: "missing", columns: [missing[1]] };
  return null;
}

/** snake_case column -> camelCase form key ("cover_photo_url" -> "coverPhotoUrl"). */
export function columnToKey(column: string): string {
  return column.trim().replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
}

export const CONSTRAINT_TEXT = {
  duplicate: "cette valeur est déjà utilisée par un autre enregistrement — choisissez-en une autre.",
  missing: "le serveur exige une valeur ici — renseignez ce champ.",
};

const INCOMPLETE_ITEMS: Record<string, { field: string; message: string }> = {
  "name": { field: "name", message: "requis — le circuit n'a pas de nom." },
  "description": { field: "description", message: "requise — la description courte est vide." },
  "at least one keyword": { field: "keywords", message: "ajoutez au moins un mot-clé." },
  "at least one itinerary step": { field: "programSteps", message: "ajoutez au moins une étape d'itinéraire." },
  "insurance confirmation": { field: "insuranceConfirmed", message: "cochez l'attestation de responsabilité civile." },
  "compliance confirmation": { field: "complianceConfirmed", message: "cochez l'attestation de conformité réglementaire." },
};

const issueFor = (field: string, message: string): Issue => ({
  step: FIELD_STEP[field] ?? -1,
  field,
  label: FIELD_LABEL[field] ?? field,
  message,
});

/**
 * Three refusals arrive as one plain sentence with no per-field map (the
 * tour service throws them itself). Read the sentence so each still lands on
 * its own field and step instead of a generic "Serveur" line.
 */
export function knownTourMessageIssues(message: string): Issue[] | null {
  const dup = /A tour with the name '(.*)' already exists/.exec(message);
  if (dup) return [issueFor("name", `un circuit nommé « ${dup[1]} » existe déjà — changez le nom.`)];

  if (/Sale price must be lower than the regular passenger adult price/.test(message)) {
    return [issueFor("salePriceAdult", "doit être inférieur au prix adulte normal — baissez la promo ou augmentez le prix adulte.")];
  }

  const incomplete = /Tour is not complete:\s*(.*?)(?:\s+[—-]\s+\(HTTP \d+\))?\s*$/.exec(message);
  if (incomplete) {
    const items = incomplete[1].split(", ").map((s) => s.trim()).filter(Boolean);
    return items.map((item) => {
      const known = INCOMPLETE_ITEMS[item];
      return known ? issueFor(known.field, known.message) : { step: -1, field: "", label: "Circuit incomplet", message: item };
    });
  }
  return null;
}

export function serverIssues(fields: Record<string, string>, fallbackMessage: string): Issue[] {
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    const known = knownTourMessageIssues(fallbackMessage);
    if (known) return known;
    const constraint = parseConstraintMessage(fallbackMessage);
    if (constraint) {
      return constraint.columns.map((column) => {
        const key = columnToKey(column);
        return {
          step: FIELD_STEP[key] ?? -1,
          field: key,
          label: FIELD_LABEL[key] ?? column,
          message: CONSTRAINT_TEXT[constraint.kind],
        };
      });
    }
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
