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

// `path` used to be free-text ("ex. /nuitee-campement-desert/ — commence
// par /, respecte la barre oblique finale...") - error-prone by design:
// middleware.ts matches a maintenance window by an EXACT string match
// against pathname, so a single typo (a missing trailing slash, a wrong
// locale prefix) silently creates a window that never fires for any real
// visitor. Found live during a UI/UX pass (31 Aug 2026), not assumed.
// Replaced with a real dropdown built from `pageOptions` - the site's own
// live sitemap.xml (lib/sitemap.ts's getSitemapEntries, the exact file
// Google receives), so every option is guaranteed to be a real, currently
// published URL, in every locale, with no typing involved.
function buildFields(pageOptions: { value: string; label: string }[]): FieldDef[] {
  return [
    {
      type: "select",
      key: "path",
      label: "Page",
      options: pageOptions,
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
}

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
  pageOptions,
}: {
  id?: string;
  initialData?: AdminMaintenanceWindow;
  /** Real, live paths from the site's own sitemap.xml — fetched server-side
   *  by the route (new/page.tsx, [id]/page.tsx) via lib/sitemap.ts, never
   *  hardcoded here. Empty array degrades to a select with no options
   *  rather than crashing — see that fallback's own note below. */
  pageOptions: { value: string; label: string }[];
}) {
  // If the currently-saved path (editing an existing window) isn't in
  // today's live sitemap - a page that existed when the window was
  // created but was since removed/unpublished - keep it selectable
  // instead of silently swapping it out from under the person editing.
  // "/*" is a synthetic sentinel, not a real sitemap URL — middleware.ts
  // treats it as "match every path" (site-wide gate), for a launch/relaunch
  // countdown rather than one page down. Passes the backend's own
  // `^/.*` path validation (MaintenanceWindowRequest) as-is, no schema
  // change needed. Prepended, not mixed alphabetically into the real
  // pages, so it stays obviously distinct in the dropdown.
  const withSiteWide = [{ value: "/*", label: "🌐 Tout le site (compte à rebours de lancement)" }, ...pageOptions];
  const options =
    initialData?.path && initialData.path !== "/*" && !pageOptions.some((o) => o.value === initialData.path)
      ? [{ value: initialData.path, label: `${initialData.path} (page introuvable dans le sitemap actuel)` }, ...withSiteWide]
      : withSiteWide;

  return (
    <CollectionEditor
      collectionLabel="Maintenance"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={initialData ?? { ...emptyForm, path: options[0]?.value ?? "" }}
      fields={buildFields(options)}
      toRequestBody={toRequestBody}
      titleKey="path"
    />
  );
}
