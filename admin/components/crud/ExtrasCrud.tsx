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

const emptyForm = {
  name: "",
  slug: "",
  duration: "",
  location: "",
  description: "",
  unitPrice: 0,
  tva: 13,
  isActive: true,
};

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
