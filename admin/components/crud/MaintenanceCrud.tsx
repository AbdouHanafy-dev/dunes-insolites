"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef, FieldDef } from "@/components/payload/fields";
import type { AdminMaintenanceWindow } from "@/lib/api";

const BASE_PATH = "/administration/maintenance";
const API_PATH = "maintenance-windows";

const columns: ColumnDef<AdminMaintenanceWindow>[] = [
  { key: "path", label: "Page" },
  {
    key: "isActive",
    label: "Statut",
    render: (item) => (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
          item.isActive ? "bg-emerald/12 text-emerald" : "bg-navy-700/8 text-navy-700/60"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${item.isActive ? "bg-emerald" : "bg-navy-700/40"}`} />
        {item.isActive ? "En maintenance" : "Inactif"}
      </span>
    ),
  },
  {
    key: "endsAt",
    label: "Fin prévue",
    render: (item) =>
      item.endsAt
        ? new Date(item.endsAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
        : "—",
  },
];

const fields: FieldDef[] = [
  {
    type: "text",
    key: "path",
    label: "Chemin de la page",
    required: true,
    hint: "ex. /nuitee-campement-desert/ — commence par /, respecte la barre oblique finale du site. Une page localisée (ex. /en/...) a son propre chemin.",
  },
  {
    type: "checkbox",
    key: "isActive",
    label: "Afficher la page de maintenance maintenant",
  },
  {
    type: "datetime",
    key: "endsAt",
    label: "Fin prévue (optionnel)",
    hint: "affiche un compte à rebours sur la page — laissez vide pour un simple \"de retour bientôt\"",
  },
  {
    type: "textarea",
    key: "message",
    label: "Message (optionnel)",
    hint: "remplace le texte par défaut affiché aux visiteurs",
  },
];

const emptyForm = { path: "", isActive: true, endsAt: null, message: "" };

// datetime-local gives "" for an empty picker and a bare
// "YYYY-MM-DDTHH:mm" otherwise; the backend's LocalDateTime needs null for
// "no countdown" rather than an empty string, and a blank message should
// clear the custom text rather than send "".
function toRequestBody(form: Record<string, unknown>) {
  return {
    ...form,
    endsAt: form.endsAt || null,
    message: (form.message as string)?.trim() || null,
  };
}

export function MaintenanceList({ initialItems }: { initialItems: AdminMaintenanceWindow[] }) {
  return (
    <CollectionList
      title="Maintenance"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="maintenanceId"
      titleKey="path"
      items={initialItems}
      columns={columns}
    />
  );
}

export function MaintenanceEditor({
  id,
  initialData,
}: {
  id?: string;
  initialData?: AdminMaintenanceWindow;
}) {
  return (
    <CollectionEditor
      collectionLabel="Maintenance"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={initialData ?? emptyForm}
      fields={fields}
      toRequestBody={toRequestBody}
      titleKey="path"
    />
  );
}
