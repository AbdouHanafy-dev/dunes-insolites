"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef, FieldDef } from "@/components/payload/fields";
import type { AdminServiceOption } from "@/lib/api";

const BASE_PATH = "/catalogue/guides-transport";
const API_PATH = "service-options";

const columns: ColumnDef<AdminServiceOption>[] = [
  { key: "name", label: "Nom" },
  {
    key: "category",
    label: "Catégorie",
    render: (item) => (item.category === "GUIDE" ? "Guide" : "Transport"),
  },
  { key: "type", label: "Type" },
  {
    key: "unitPriceTtc",
    label: "Prix",
    render: (item) =>
      item.unitPriceTtc == null ? "—" : `${item.unitPriceTtc} TND / ${PRICING_UNIT_LABELS[item.pricingUnit]}`,
  },
  {
    key: "active",
    label: "Statut",
    render: (item) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${
          item.active ? "bg-emerald/10 text-emerald" : "bg-gray-100 text-gray-500"
        }`}
      >
        {item.active ? "Actif" : "Inactif"}
      </span>
    ),
  },
];

const PRICING_UNIT_LABELS: Record<AdminServiceOption["pricingUnit"], string> = {
  PER_DAY: "jour",
  PER_BOOKING: "réservation",
  PER_PERSON: "personne",
  PER_VEHICLE: "véhicule",
};

const fields: FieldDef[] = [
  { type: "text", key: "name", label: "Nom", required: true },
  { type: "text", key: "slug", label: "Slug (identifiant)", required: true },
  { type: "textarea", key: "description", label: "Description" },
  {
    type: "select",
    key: "category",
    label: "Catégorie",
    options: [
      { value: "GUIDE", label: "Guide" },
      { value: "TRANSPORT", label: "Transport / pickup" },
    ],
    hint: "Guide est toujours proposé ; Transport n'est proposé qu'au client sans véhicule.",
  },
  {
    type: "text",
    key: "type",
    label: "Type",
    hint: 'Libre, ex. "GUIDE_WITH_SUPPORT_VEHICLE", "HOTEL_PICKUP", "AIRPORT_PICKUP", "PRIVATE_TRANSFER" — pas de liste fermée, tu peux inventer de nouveaux types.',
  },
  {
    type: "select",
    key: "pricingUnit",
    label: "Unité de tarification",
    options: [
      { value: "PER_DAY", label: "Par jour" },
      { value: "PER_BOOKING", label: "Par réservation (forfait)" },
      { value: "PER_PERSON", label: "Par personne" },
      { value: "PER_VEHICLE", label: "Par véhicule" },
    ],
  },
  { type: "number", key: "unitPriceTtc", label: "Prix (TTC)", hint: "Vide = pas encore réservable en ligne." },
  { type: "number", key: "tvaRate", label: "TVA (%)", step: 0.1 },
  {
    type: "number",
    key: "maxUnitsPerDay",
    label: "Capacité par jour",
    hint: "Nombre total disponible par jour (guides, véhicules…). Vide = pas de limite.",
  },
  {
    type: "checkbox",
    key: "requiresPickupLocation",
    label: "Nécessite une localisation de pickup (hôtel/aéroport/adresse)",
  },
  {
    type: "checkbox",
    key: "requiresCustomerVehicle",
    label: "Le guide accompagne le client dans SON véhicule (incompatible avec toute option Transport)",
  },
  { type: "number", key: "displayOrder", label: "Ordre d'affichage" },
  { type: "checkbox", key: "active", label: "Actif" },
];

const emptyForm = {
  slug: "",
  name: "",
  description: "",
  category: "GUIDE" as const,
  type: "",
  pricingUnit: "PER_DAY" as const,
  unitPriceTtc: null,
  tvaRate: 0,
  maxUnitsPerDay: null,
  requiresPickupLocation: false,
  requiresCustomerVehicle: false,
  displayOrder: 0,
  active: true,
};

export function ServiceOptionsList({ initialItems }: { initialItems: AdminServiceOption[] }) {
  return (
    <CollectionList
      title="Guides & transport"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="id"
      titleKey="name"
      items={initialItems}
      columns={columns}
    />
  );
}

export function ServiceOptionEditor({ id, initialData }: { id?: string; initialData?: AdminServiceOption }) {
  return (
    <CollectionEditor
      collectionLabel="Guides & transport"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={initialData ?? emptyForm}
      fields={fields}
    />
  );
}
