"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef, FieldDef } from "@/components/payload/fields";
import type { AdminNavigationItem } from "@/lib/api";

const BASE_PATH = "/content/navigation";
const API_PATH = "navigation";

const MENU_TYPE_LABEL: Record<string, string> = {
  NONE: "Aucun",
  EXPERIENCES: "Mega-menu — Expériences",
  STAYS: "Mega-menu — Séjours",
};

const columns: ColumnDef<AdminNavigationItem>[] = [
  { key: "label", label: "Libellé" },
  { key: "url", label: "Lien" },
  { key: "locale", label: "Langue" },
  { key: "displayOrder", label: "Ordre" },
  { key: "menuType", label: "Mega-menu", render: (item) => MENU_TYPE_LABEL[item.menuType] ?? item.menuType },
];

const fields: FieldDef[] = [
  { type: "text", key: "label", label: "Libellé", required: true },
  { type: "text", key: "url", label: "Lien", required: true, hint: "ex. /activities, /camp, /contact" },
  {
    type: "select",
    key: "locale",
    label: "Langue",
    options: [
      { value: "FR", label: "Français" },
      { value: "EN", label: "English" },
      { value: "DE", label: "Deutsch" },
      { value: "IT", label: "Italiano" },
      { value: "DA", label: "Dansk" },
      { value: "AR", label: "العربية" },
    ],
  },
  {
    type: "select",
    key: "companyType",
    label: "Marque",
    options: [
      { value: "DUNES_INSOLITES", label: "Dunes Insolites" },
      { value: "ROUTE_INSOLITE", label: "Route Insolite" },
    ],
  },
  { type: "number", key: "displayOrder", label: "Ordre d'affichage", required: true },
  {
    type: "select",
    key: "menuType",
    label: "Mega-menu",
    options: [
      { value: "NONE", label: "Aucun" },
      { value: "EXPERIENCES", label: "Expériences (cartes d'activités)" },
      { value: "STAYS", label: "Séjours (cartes d'hébergements)" },
    ],
  },
];

const emptyForm = {
  label: "",
  url: "",
  locale: "FR",
  companyType: "DUNES_INSOLITES",
  displayOrder: 0,
  menuType: "NONE",
};

export function NavigationList({ initialItems }: { initialItems: AdminNavigationItem[] }) {
  return (
    <CollectionList
      title="Navigation"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="navItemId"
      titleKey="label"
      items={initialItems}
      columns={columns}
    />
  );
}

export function NavigationEditor({
  id,
  initialData,
}: {
  id?: string;
  initialData?: AdminNavigationItem;
}) {
  return (
    <CollectionEditor
      collectionLabel="Navigation"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={initialData ?? emptyForm}
      fields={fields}
      titleKey="label"
    />
  );
}
