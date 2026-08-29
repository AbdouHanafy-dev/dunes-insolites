"use client";

import CollectionList from "@/components/payload/CollectionList";
import type { ColumnDef } from "@/components/payload/fields";
import type { AdminPage } from "@/lib/api";

const columns: ColumnDef<AdminPage>[] = [
  { key: "title", label: "Titre" },
  { key: "slug", label: "Slug" },
  { key: "locale", label: "Langue" },
  {
    key: "companyType",
    label: "Marque",
    render: (item) => (item.companyType === "DUNES_INSOLITES" ? "Dunes Insolites" : "Route Insolite"),
  },
  {
    key: "category",
    label: "Catégorie",
    render: (item) =>
      item.category === "GUIDE" ? (
        <span className="rounded-full bg-gold/12 px-2 py-0.5 text-[12px] font-medium text-navy-800">
          Guide
        </span>
      ) : (
        <span className="text-[12px] text-navy-700/40">—</span>
      ),
  },
  {
    key: "status",
    label: "Statut",
    render: (item) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${
          item.status === "PUBLISHED" ? "bg-emerald/10 text-emerald" : "bg-gray-100 text-gray-500"
        }`}
      >
        {item.status === "PUBLISHED" ? "Publiée" : "Brouillon"}
      </span>
    ),
  },
];

export default function PagesList({ initialItems }: { initialItems: AdminPage[] }) {
  return (
    <CollectionList
      title="Pages"
      basePath="/content/pages"
      apiPath="pages"
      idKey="pageId"
      titleKey="title"
      items={initialItems}
      columns={columns}
    />
  );
}
