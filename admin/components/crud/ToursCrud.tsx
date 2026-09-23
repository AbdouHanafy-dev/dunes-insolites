"use client";

import CollectionList from "@/components/payload/CollectionList";
import type { ColumnDef } from "@/components/payload/fields";
import type { AdminTour } from "@/lib/api";

const BASE_PATH = "/catalogue/tours";
const API_PATH = "tours";

const columns: ColumnDef<AdminTour>[] = [
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

export function ToursList({ initialItems }: { initialItems: AdminTour[] }) {
  return (
    <CollectionList
      title="Circuits"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="tourId"
      titleKey="name"
      items={initialItems}
      columns={columns}
    />
  );
}
