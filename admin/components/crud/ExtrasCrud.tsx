"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef } from "@/components/payload/fields";
import type { FieldDef } from "@/components/payload/fields";
import TranslationsField, {
  type CatalogTranslationForm,
  translationsToArray,
  translationsToRecord,
} from "@/components/payload/TranslationsField";
import PhotoGalleryField, { type TourPhoto } from "@/components/tour-wizard/PhotoGalleryField";
import type { AdminExtra } from "@/lib/api";

const BASE_PATH = "/catalogue/extras";
const API_PATH = "extras";

const columns: ColumnDef<AdminExtra>[] = [
  { key: "name", label: "Nom" },
  { key: "baseDurationMinutes", label: "Durée", render: (item) => `${item.baseDurationMinutes} min` },
  { key: "unitPrice", label: "Prix unitaire", render: (item) => `${item.unitPrice} € / ${item.baseDurationMinutes} min` },
  {
    key: "isActive",
    label: "Statut",
    render: (item) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${
          item.isActive ? "bg-emerald/10 text-emerald" : "bg-gray-100 text-gray-500"
        }`}
      >
        {item.isActive ? "Actif" : "Inactif"}
      </span>
    ),
  },
];

const fields: FieldDef[] = [
  { type: "text", key: "name", label: "Nom", required: true },
  { type: "text", key: "slug", label: "Slug (URL)" },
  { type: "text", key: "location", label: "Lieu" },
  { type: "textarea", key: "description", label: "Description" },
  {
    type: "number",
    key: "baseDurationMinutes",
    step: 1,
    label: "Durée de base (minutes)",
    required: true,
    hint: "Durée couverte par le prix unitaire (30 par défaut).",
  },
  {
    type: "number",
    key: "durationStepMinutes",
    step: 1,
    label: "Pas d'allongement (minutes)",
    required: true,
    hint: "Ce que le client ajoute à chaque « + ». 30 : 30 min → 1 heure → 1h30…",
  },
  {
    type: "number",
    key: "maxDurationMinutes",
    step: 1,
    label: "Durée maximale (minutes)",
    required: true,
    hint: "Égale à la durée de base = le client ne peut pas allonger. Le prix est le prix unitaire × durée ÷ durée de base.",
  },
  { type: "number", key: "unitPrice", label: "Prix unitaire (pour la durée de base)", required: true },
  { type: "number", key: "tva", label: "TVA (%)", required: true, step: 0.1 },
  {
    type: "number",
    key: "maxUnitsPerDay",
    label: "Capacité par jour",
    hint: "Nombre total d'unités (quads, places chameau…) disponibles par jour. Laisser vide = pas de limite.",
  },
  { type: "checkbox", key: "isActive", label: "Actif" },
];

const serviceFields: FieldDef[] = [
  { type: "text", key: "name", label: "Nom", required: true },
  { type: "text", key: "slug", label: "Slug", required: true },
  { type: "textarea", key: "description", label: "Description" },
  { type: "select", key: "category", label: "Catégorie", options: [
    { value: "TRANSPORT", label: "Véhicule / transport / pickup" },
    { value: "GUIDE", label: "Option guide interne (non sélectionnée par le client)" },
    { value: "RESOURCE", label: "Ressource interne (guide/véhicule)" },
  ] },
  { type: "text", key: "serviceType", label: "Type métier", hint: "Ex. HOTEL_PICKUP, GUIDE_WITH_SUPPORT_VEHICLE" },
  { type: "select", key: "pricingUnit", label: "Unité tarifaire", options: [
    { value: "PER_DAY", label: "Par jour" },
    { value: "PER_BOOKING", label: "Par réservation" },
    { value: "PER_PERSON", label: "Par personne" },
    { value: "PER_VEHICLE", label: "Par véhicule" },
  ] },
  { type: "number", key: "unitPrice", label: "Prix TTC", required: true },
  { type: "number", key: "tva", label: "TVA (%)", required: true, step: 0.1 },
  { type: "number", key: "maxUnitsPerDay", label: "Capacité par jour" },
  { type: "checkbox", key: "requiresCustomerVehicle", label: "Nécessite le véhicule du client" },
  { type: "checkbox", key: "pickupHotelName", label: "Afficher Hôtel" },
  { type: "checkbox", key: "pickupAirport", label: "Afficher Aéroport" },
  { type: "checkbox", key: "pickupFlightNumber", label: "Afficher Numéro de vol" },
  { type: "checkbox", key: "pickupAddress", label: "Afficher Adresse / point de rendez-vous" },
  { type: "checkbox", key: "pickupArrivalTime", label: "Afficher Heure d'arrivée" },
  { type: "checkbox", key: "pickupInstructions", label: "Afficher Instructions" },
  { type: "text", key: "resourceRequirementsJson", label: "Ressources composées (JSON)", hint: '[{"resourceExtraId":"uuid","quantity":1}]' },
  { type: "number", key: "displayOrder", label: "Ordre d'affichage" },
  { type: "checkbox", key: "isActive", label: "Actif" },
];

const emptyForm = {
  name: "",
  slug: "",
  duration: "",
  baseDurationMinutes: 30,
  durationStepMinutes: 30,
  maxDurationMinutes: 30,
  location: "",
  description: "",
  unitPrice: 0,
  tva: 13,
  isActive: true,
  category: "ACTIVITY" as const,
  pricingUnit: "PER_UNIT" as const,
  translations: {} as Record<string, CatalogTranslationForm>,
};

const emptyServiceForm = {
  ...emptyForm,
  category: "TRANSPORT" as const,
  pricingUnit: "PER_VEHICLE" as const,
  serviceType: "",
  requiresCustomerVehicle: false,
  displayOrder: 0,
  resourceRequirementsJson: "[]",
};

function extraForm(item?: AdminExtra): Record<string, unknown> {
  if (!item) return emptyForm;
  return { ...item, translations: translationsToRecord(item.translations) };
}

function extraRequest(form: Record<string, unknown>) {
  return { ...form, translations: translationsToArray(form.translations as Record<string, CatalogTranslationForm>) };
}

function serviceForm(item?: AdminExtra): Record<string, unknown> {
  if (!item) return emptyServiceForm;
  const pickup = new Set(item.pickupFields ?? []);
  return {
    ...item,
    pickupHotelName: pickup.has("HOTEL_NAME"),
    pickupAirport: pickup.has("AIRPORT"),
    pickupFlightNumber: pickup.has("FLIGHT_NUMBER"),
    pickupAddress: pickup.has("ADDRESS"),
    pickupArrivalTime: pickup.has("ARRIVAL_TIME"),
    pickupInstructions: pickup.has("INSTRUCTIONS"),
    resourceRequirementsJson: JSON.stringify(item.resourceRequirements ?? [], null, 2),
    translations: translationsToRecord(item.translations),
  };
}

function serviceRequest(form: Record<string, unknown>) {
  const pickupFields = [
    ["pickupHotelName", "HOTEL_NAME"], ["pickupAirport", "AIRPORT"],
    ["pickupFlightNumber", "FLIGHT_NUMBER"], ["pickupAddress", "ADDRESS"],
    ["pickupArrivalTime", "ARRIVAL_TIME"], ["pickupInstructions", "INSTRUCTIONS"],
  ].filter(([key]) => form[key] === true).map(([, field]) => field);
  let resourceRequirements: unknown[] = [];
  try { resourceRequirements = JSON.parse(String(form.resourceRequirementsJson ?? "[]")); } catch { /* backend will receive empty */ }
  const type = String(form.serviceType ?? "").toUpperCase();
  const primary = type.includes("HOTEL") ? "HOTEL_NAME" : type.includes("AIRPORT") ? "AIRPORT" : "ADDRESS";
  return { ...form, pickupFields, requiredPickupFields: pickupFields.includes(primary) ? [primary] : [],
    resourceRequirements, resourceRequirementsJson: undefined,
    translations: translationsToArray(form.translations as Record<string, CatalogTranslationForm>) };
}

/** Cover photo + gallery of an activity, shown on its page and in the activity lists. */
function activityExtraSection(form: Record<string, unknown>, patch: (fields: Record<string, unknown>) => void) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-[15px] font-bold text-navy-800">Photos</h2>
        <p className="mb-4 mt-1 text-[13px] text-navy-700/60">
          La photo de couverture s’affiche en grand en haut de la page et dans la liste des activités ; la galerie
          complète la page. Sans photo, le site garde sa photo par défaut.
        </p>
        <PhotoGalleryField
          coverPhotoUrl={(form.coverPhotoUrl as string | null) ?? null}
          onCoverChange={(url) => patch({ coverPhotoUrl: url })}
          photos={((form.photos as TourPhoto[] | undefined) ?? []).map((p) => ({ url: p.url, caption: p.caption ?? null }))}
          onPhotosChange={(photos) => patch({ photos })}
        />
      </div>
      {translationsSection(form, patch)}
    </div>
  );
}

function translationsSection(form: Record<string, unknown>, patch: (fields: Record<string, unknown>) => void) {
  return (
    <TranslationsField
      translations={(form.translations as Record<string, CatalogTranslationForm>) ?? {}}
      onChange={(translations) => patch({ translations })}
    />
  );
}

export function ExtrasList({ initialItems }: { initialItems: AdminExtra[] }) {
  return (
    <CollectionList
      title="Activités"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="extraId"
      titleKey="name"
      items={initialItems}
      columns={columns}
    />
  );
}

export function ExtraEditor({ id, initialData }: { id?: string; initialData?: AdminExtra }) {
  return (
    <CollectionEditor
      collectionLabel="Activités"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={extraForm(initialData)}
      fields={fields}
      toRequestBody={extraRequest}
      extraSection={activityExtraSection}
    />
  );
}

export function ServiceExtrasList({ initialItems }: { initialItems: AdminExtra[] }) {
  return <CollectionList title="Véhicules & transport" basePath="/catalogue/guides-transport"
    apiPath="extras" idKey="extraId" titleKey="name" items={initialItems}
    columns={columns} />;
}

export function ServiceExtraEditor({ id, initialData }: { id?: string; initialData?: AdminExtra }) {
  return <CollectionEditor collectionLabel="Véhicules & transport"
    basePath="/catalogue/guides-transport" apiPath="extras" id={id}
    initialData={serviceForm(initialData)} fields={serviceFields} toRequestBody={serviceRequest}
    extraSection={translationsSection} />;
}
