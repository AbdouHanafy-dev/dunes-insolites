"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef, FieldDef } from "@/components/payload/fields";
import type { AdminGalleryImage } from "@/lib/api";

const BASE_PATH = "/content/gallery";
const API_PATH = "gallery";

const columns: ColumnDef<AdminGalleryImage>[] = [
  { key: "position", label: "Ordre" },
  { key: "alt", label: "Description" },
  { key: "tag", label: "Filtre" },
  { key: "tall", label: "Grand", render: (i) => (i.tall ? "Oui" : "—") },
];

const fields: FieldDef[] = [
  {
    type: "text",
    key: "imageUrl",
    label: "Image (URL)",
    required: true,
    hint: "colle l’URL d’une image de la Médiathèque, ex. /media/xxxx.jpg",
  },
  {
    type: "text",
    key: "alt",
    label: "Description (texte alternatif)",
    required: true,
    hint: "décrit la photo — sert de légende sur la page d’accueil et pour l’accessibilité",
  },
  {
    type: "text",
    key: "tag",
    label: "Filtre",
    required: true,
    hint: "facette de la galerie, ex. « Balade à dos de dromadaire » — regroupe les photos sur la page /gallery",
  },
  {
    type: "number",
    key: "position",
    label: "Ordre d’affichage",
    step: 1,
  },
  {
    type: "checkbox",
    key: "tall",
    label: "Grande tuile (occupe deux rangées dans la mosaïque)",
  },
];

const emptyForm = { imageUrl: "", alt: "", tag: "", position: 0, tall: false };

export function GalleryList({ initialItems }: { initialItems: AdminGalleryImage[] }) {
  return (
    <CollectionList
      title="Galerie photos"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="galleryItemId"
      titleKey="alt"
      items={initialItems}
      columns={columns}
    />
  );
}

export function GalleryEditor({
  id,
  initialData,
}: {
  id?: string;
  initialData?: AdminGalleryImage;
}) {
  return (
    <CollectionEditor
      collectionLabel="Galerie photos"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={initialData ?? emptyForm}
      fields={fields}
      titleKey="alt"
    />
  );
}
