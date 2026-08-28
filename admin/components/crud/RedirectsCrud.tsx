"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef, FieldDef } from "@/components/payload/fields";
import type { AdminRedirect } from "@/lib/api";

const BASE_PATH = "/seo/redirections";
const API_PATH = "redirects";

const columns: ColumnDef<AdminRedirect>[] = [
  { key: "fromPath", label: "Depuis" },
  { key: "toPath", label: "Vers" },
  { key: "statusCode", label: "Code" },
];

const fields: FieldDef[] = [
  {
    type: "text",
    key: "fromPath",
    label: "Ancien chemin",
    required: true,
    hint: "ex. /ancienne-page/ — commence par /, respecte la barre oblique finale du site",
  },
  {
    type: "text",
    key: "toPath",
    label: "Nouveau chemin",
    required: true,
    hint: "ex. /nouvelle-page/ — ou une URL complète pour rediriger vers un autre domaine",
  },
  {
    type: "select",
    key: "statusCode",
    label: "Type",
    options: [
      { value: "301", label: "301 — permanent (recommandé pour le SEO)" },
      { value: "302", label: "302 — temporaire" },
    ],
  },
];

const emptyForm = { fromPath: "", toPath: "", statusCode: "301" };

export function RedirectsList({ initialItems }: { initialItems: AdminRedirect[] }) {
  return (
    <CollectionList
      title="Redirections"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="redirectId"
      titleKey="fromPath"
      items={initialItems}
      columns={columns}
    />
  );
}

export function RedirectEditor({ id, initialData }: { id?: string; initialData?: AdminRedirect }) {
  return (
    <CollectionEditor
      collectionLabel="Redirections"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={initialData ?? emptyForm}
      fields={fields}
      titleKey="fromPath"
    />
  );
}
