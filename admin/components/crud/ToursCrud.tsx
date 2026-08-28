"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef, FieldDef } from "@/components/payload/fields";
import type { AdminTour } from "@/lib/api";

const BASE_PATH = "/catalogue/tours";
const API_PATH = "tours";

const columns: ColumnDef<AdminTour>[] = [
  { key: "name", label: "Nom" },
  { key: "duration", label: "Durée" },
  { key: "passengerAdultPrice", label: "Prix adulte", render: (item) => `${item.passengerAdultPrice} TND` },
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
  { type: "text", key: "duration", label: "Durée", hint: 'ex. "3 Jours / 2 Nuits"' },
  { type: "text", key: "location", label: "Lieu" },
  { type: "textarea", key: "description", label: "Description" },
  { type: "number", key: "passengerAdultPrice", label: "Prix adulte (passager)", required: true },
  { type: "number", key: "passengerChildPrice", label: "Prix enfant (passager)", required: true },
  { type: "number", key: "partnerAdultPrice", label: "Prix adulte (partenaire)", required: true },
  { type: "number", key: "partnerChildPrice", label: "Prix enfant (partenaire)", required: true },
  { type: "number", key: "tva", label: "TVA (%)", required: true, step: 0.1 },
  { type: "checkbox", key: "isActive", label: "Actif" },
];

const emptyForm = {
  name: "",
  slug: "",
  duration: "",
  location: "",
  description: "",
  passengerAdultPrice: 0,
  passengerChildPrice: 0,
  partnerAdultPrice: 0,
  partnerChildPrice: 0,
  tva: 13,
  isActive: true,
};

export function ToursList({ initialItems }: { initialItems: AdminTour[] }) {
  return (
    <CollectionList
      title="Tours / Circuits"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="tourId"
      titleKey="name"
      items={initialItems}
      columns={columns}
    />
  );
}

export function TourEditor({ id, initialData }: { id?: string; initialData?: AdminTour }) {
  return (
    <CollectionEditor
      collectionLabel="Tours / Circuits"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={initialData ?? emptyForm}
      fields={fields}
    />
  );
}
