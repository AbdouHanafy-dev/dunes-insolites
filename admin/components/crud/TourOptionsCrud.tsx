"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef, FieldDef } from "@/components/payload/fields";
import type { AdminExtra } from "@/lib/api";
import { optionKindLabel, optionPriceLabel, slugify } from "@/lib/tourOptions";

const BASE_PATH = "/catalogue/ameliorations";
const LABEL = "Améliorations de circuit";

const columns: ColumnDef<AdminExtra>[] = [
  { key: "name", label: "Nom" },
  { key: "serviceType", label: "Type", render: (item) => optionKindLabel(item.serviceType) },
  { key: "unitPrice", label: "Prix", render: (item) => optionPriceLabel(item.unitPrice, item.pricingUnit) },
  { key: "minPartySize", label: "À partir de", render: (item) => (item.minPartySize ? `${item.minPartySize} voyageurs` : "Toujours proposée") },
  {
    key: "isActive",
    label: "Statut",
    render: (item) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${
          item.isActive ? "bg-emerald/10 text-emerald" : "bg-gray-100 text-gray-500"
        }`}
      >
        {item.isActive ? "Affichée sur le site" : "Masquée"}
      </span>
    ),
  },
];

const fields: FieldDef[] = [
  { type: "text", key: "name", label: "Titre affiché au client", required: true, hint: "Ex. « Passer en suite », « Tente individuelle »." },
  { type: "textarea", key: "description", label: "Description", hint: "Affichée sous le titre dans le formulaire de réservation d’un circuit." },
  {
    type: "select",
    key: "serviceType",
    label: "Type",
    options: [
      { value: "UPGRADE", label: "Amélioration (tente individuelle, suite…)" },
      { value: "RETURN_CITY", label: "Autre ville de retour (une seule, prix fixe)" },
    ],
    hint: "« Autre ville de retour » sert à facturer le retour dans une ville qui n’est pas dans la liste ; n’en gardez qu’une.",
  },
  { type: "number", key: "unitPrice", label: "Prix (€)", required: true, hint: "L’amélioration n’apparaît sur le site qu’une fois « Affichée » cochée. Des prix par date sont possibles plus bas, après l’enregistrement." },
  {
    type: "select",
    key: "pricingUnit",
    label: "Comment le prix s’applique",
    options: [
      { value: "PER_PERSON_NIGHT", label: "Par personne et par nuit (tente individuelle, suite…)" },
      { value: "PER_PERSON", label: "Par personne, une seule fois" },
      { value: "PER_BOOKING", label: "Une seule fois pour toute la réservation" },
    ],
  },
  {
    type: "number",
    key: "minPartySize",
    label: "Nombre minimum de voyageurs",
    hint: "L’option est toujours visible, mais grisée et non sélectionnable tant que le groupe (adultes + enfants) est plus petit. Vide = toujours sélectionnable.",
  },
  { type: "number", key: "displayOrder", label: "Ordre d’affichage", hint: "Le plus petit nombre s’affiche en premier." },
  { type: "number", key: "tva", label: "TVA (%)", required: true, step: 0.1 },
  { type: "checkbox", key: "isActive", label: "Affichée sur le site" },
];

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  serviceType: "UPGRADE",
  unitPrice: 0,
  pricingUnit: "PER_PERSON_NIGHT",
  minPartySize: null as number | null,
  displayOrder: 0,
  tva: 13,
  isActive: true,
  category: "TOUR_OPTION" as const,
};

function optionForm(item?: AdminExtra): Record<string, unknown> {
  return item ? { ...item } : { ...emptyForm };
}

/** Everything else an extra needs, filled with what a paid option of a circuit always has. */
function optionRequest(form: Record<string, unknown>) {
  const name = String(form.name ?? "");
  return {
    ...form,
    category: "TOUR_OPTION",
    slug: String(form.slug ?? "").trim() || slugify(name),
    baseDurationMinutes: 30,
    durationStepMinutes: 30,
    maxDurationMinutes: 30,
    requiresCustomerVehicle: false,
    pickupFields: [],
    requiredPickupFields: [],
    resourceRequirements: [],
    translations: [],
  };
}

export function TourOptionsList({ initialItems }: { initialItems: AdminExtra[] }) {
  return (
    <CollectionList
      title={LABEL}
      basePath={BASE_PATH}
      apiPath="extras"
      idKey="extraId"
      titleKey="name"
      items={initialItems}
      columns={columns}
    />
  );
}

export function TourOptionEditor({ id, initialData }: { id?: string; initialData?: AdminExtra }) {
  return (
    <CollectionEditor
      collectionLabel={LABEL}
      basePath={BASE_PATH}
      apiPath="extras"
      id={id}
      initialData={optionForm(initialData)}
      fields={fields}
      toRequestBody={optionRequest}
    />
  );
}
