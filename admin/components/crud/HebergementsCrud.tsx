"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef, FieldDef } from "@/components/payload/fields";
import TranslationsField, {
  type CatalogTranslationForm,
  translationsToArray,
  translationsToRecord,
} from "@/components/payload/TranslationsField";
import AccommodationTiersManager from "@/components/crud/AccommodationTiersManager";
import PhotoGalleryField, { type TourPhoto } from "@/components/tour-wizard/PhotoGalleryField";
import type { AdminTourType } from "@/lib/api";

const BASE_PATH = "/catalogue/hebergements";
const API_PATH = "tour-types";

const columns: ColumnDef<AdminTourType>[] = [
  { key: "name", label: "Nom" },
  { key: "duration", label: "Durée" },
  { key: "passengerAdultPrice", label: "Prix adulte", render: (item) => `${item.passengerAdultPrice} €` },
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
  {
    type: "number",
    key: "maxNights",
    label: "Nombre de nuits maximum",
    hint: "1 = séjour fixe (date d'arrivée uniquement) ; plus de 1 = le client choisit une plage arrivée/départ",
    required: true,
  },
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
  {
    type: "checkbox",
    key: "hasAccommodationTypes",
    label: "Types d'hébergement — le client choisit une tente, une chambre, une suite… avant de réserver",
  },
  {
    type: "checkbox",
    key: "circuitCamp",
    label: "Camp des circuits — les circuits avec nuit au camp proposent les hébergements de ce séjour (un seul séjour à la fois)",
  },
  { type: "checkbox", key: "isActive", label: "Actif" },
];

const emptyForm = {
  name: "",
  slug: "",
  duration: "",
  maxNights: 1,
  location: "",
  description: "",
  passengerAdultPrice: 0,
  passengerChildPrice: 0,
  partnerAdultPrice: 0,
  partnerChildPrice: 0,
  tva: 13,
  guideRequired: false,
  hasAccommodationTypes: true,
  circuitCamp: false,
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
  function extraSection(form: Record<string, unknown>, patch: (fields: Record<string, unknown>) => void) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-[15px] font-bold text-navy-800">Photos du séjour</h2>
          <p className="mb-4 mt-1 text-[13px] text-navy-700/60">
            Photo de couverture et galerie de ce séjour. Les photos de chaque hébergement (tente, chambre, suite) se
            changent plus bas, dans « Tiers d’hébergement ».
          </p>
          <PhotoGalleryField
            coverPhotoUrl={(form.coverPhotoUrl as string | null) ?? null}
            onCoverChange={(url) => patch({ coverPhotoUrl: url })}
            photos={((form.photos as TourPhoto[] | undefined) ?? []).map((p) => ({ url: p.url, caption: p.caption ?? null }))}
            onPhotosChange={(photos) => patch({ photos })}
          />
        </div>
        {translationsSection(form, patch)}
        {(form.hasAccommodationTypes !== false || form.circuitCamp === true) && (
          <div className="border-t border-navy-700/8 pt-6">
            <AccommodationTiersManager tourTypeId={id} />
          </div>
        )}
      </div>
    );
  }

  return (
    <CollectionEditor
      collectionLabel="Hébergements"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={tourTypeForm(initialData)}
      fields={fields}
      toRequestBody={tourTypeRequest}
      extraSection={extraSection}
    />
  );
}
