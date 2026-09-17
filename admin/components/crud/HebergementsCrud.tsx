"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef, FieldDef } from "@/components/payload/fields";
import TranslationsField, {
  type CatalogTranslationForm,
  translationsToArray,
  translationsToRecord,
} from "@/components/payload/TranslationsField";
import type { AdminTourType } from "@/lib/api";

const BASE_PATH = "/catalogue/hebergements";
const API_PATH = "tour-types";

const columns: ColumnDef<AdminTourType>[] = [
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
  { type: "text", key: "duration", label: "Durée", hint: 'ex. "1 Nuitée"' },
  { type: "text", key: "location", label: "Lieu" },
  { type: "textarea", key: "description", label: "Description" },
  { type: "number", key: "passengerAdultPrice", label: "Prix adulte (passager)", required: true },
  { type: "number", key: "passengerChildPrice", label: "Prix enfant (passager)", required: true },
  { type: "number", key: "partnerAdultPrice", label: "Prix adulte (partenaire)", required: true },
  { type: "number", key: "partnerChildPrice", label: "Prix enfant (partenaire)", required: true },
  { type: "number", key: "tva", label: "TVA (%)", required: true, step: 0.1 },
  {
    type: "checkbox",
    key: "guideRequired",
    label: "Guide obligatoire — le client doit choisir un guide avant de continuer",
  },
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
  guideRequired: false,
  isActive: true,
  translations: {} as Record<string, CatalogTranslationForm>,
};

function tourTypeForm(item?: AdminTourType): Record<string, unknown> {
  if (!item) return emptyForm;
  return { ...item, translations: translationsToRecord(item.translations) };
}

function tourTypeRequest(form: Record<string, unknown>) {
  return { ...form, translations: translationsToArray(form.translations as Record<string, CatalogTranslationForm>) };
}

function translationsSection(form: Record<string, unknown>, patch: (fields: Record<string, unknown>) => void) {
  return (
    <TranslationsField
      translations={(form.translations as Record<string, CatalogTranslationForm>) ?? {}}
      onChange={(translations) => patch({ translations })}
    />
  );
}

export function HebergementsList({ initialItems }: { initialItems: AdminTourType[] }) {
  return (
    <CollectionList
      title="Hébergements"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="tourTypeId"
      titleKey="name"
      items={initialItems}
      columns={columns}
    />
  );
}

export function HebergementEditor({ id, initialData }: { id?: string; initialData?: AdminTourType }) {
  return (
    <CollectionEditor
      collectionLabel="Hébergements"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={tourTypeForm(initialData)}
      fields={fields}
      toRequestBody={tourTypeRequest}
      extraSection={translationsSection}
    />
  );
}
