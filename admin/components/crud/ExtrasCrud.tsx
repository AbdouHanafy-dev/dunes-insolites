"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef } from "@/components/payload/fields";
import type { FieldDef } from "@/components/payload/fields";
import type { AdminExtra } from "@/lib/api";

const BASE_PATH = "/catalogue/extras";
const API_PATH = "extras";

const columns: ColumnDef<AdminExtra>[] = [
  { key: "name", label: "Nom" },
  { key: "duration", label: "Durée" },
  { key: "unitPrice", label: "Prix unitaire", render: (item) => `${item.unitPrice} TND` },
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
  { type: "text", key: "duration", label: "Durée", hint: 'ex. "30 minute"' },
  { type: "text", key: "location", label: "Lieu" },
  { type: "textarea", key: "description", label: "Description" },
  { type: "number", key: "unitPrice", label: "Prix unitaire", required: true },
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
    { value: "GUIDE", label: "Guide" },
    { value: "TRANSPORT", label: "Transport / pickup" },
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
  location: "",
  description: "",
  unitPrice: 0,
  tva: 13,
  isActive: true,
  category: "ACTIVITY" as const,
  pricingUnit: "PER_UNIT" as const,
};

const emptyServiceForm = {
  ...emptyForm,
  category: "GUIDE" as const,
  pricingUnit: "PER_DAY" as const,
  serviceType: "",
  requiresCustomerVehicle: false,
  displayOrder: 0,
  resourceRequirementsJson: "[]",
};

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
    resourceRequirements, resourceRequirementsJson: undefined };
}

export function ExtrasList({ initialItems }: { initialItems: AdminExtra[] }) {
  return (
    <CollectionList
      title="Extras"
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
      collectionLabel="Extras"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={initialData ?? emptyForm}
      fields={fields}
    />
  );
}

export function ServiceExtrasList({ initialItems }: { initialItems: AdminExtra[] }) {
  return <CollectionList title="Guides & transport" basePath="/catalogue/guides-transport"
    apiPath="extras" idKey="extraId" titleKey="name" items={initialItems}
    columns={columns} />;
}

export function ServiceExtraEditor({ id, initialData }: { id?: string; initialData?: AdminExtra }) {
  return <CollectionEditor collectionLabel="Guides & transport"
    basePath="/catalogue/guides-transport" apiPath="extras" id={id}
    initialData={serviceForm(initialData)} fields={serviceFields} toRequestBody={serviceRequest} />;
}
