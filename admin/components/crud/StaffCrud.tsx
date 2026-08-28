"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef, FieldDef } from "@/components/payload/fields";
import type { AdminUser } from "@/lib/api";

// Staff accounts (ADMIN/CAMPING) — distinct from the Clients & Partenaires
// list (/clients), which defaults to CLIENT/PARTENAIRE. Same /api/users
// endpoints, scoped by the roles this list requests and offers.
const BASE_PATH = "/administration/utilisateurs";
const API_PATH = "users";
const CREATE_PATH = "users/add";

const columns: ColumnDef<AdminUser>[] = [
  { key: "name", label: "Nom" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Téléphone" },
  {
    key: "role",
    label: "Rôle",
    render: (item) => (item.role === "ADMIN" ? "Administrateur" : "Camping"),
  },
];

const fields: FieldDef[] = [
  { type: "text", key: "name", label: "Nom", required: true },
  { type: "text", key: "email", label: "Email", required: true },
  { type: "text", key: "password", label: "Mot de passe", hint: "vide = généré automatiquement" },
  { type: "text", key: "phone", label: "Téléphone" },
  {
    type: "select",
    key: "role",
    label: "Rôle",
    options: [
      { value: "ADMIN", label: "Administrateur" },
      { value: "CAMPING", label: "Camping" },
    ],
  },
];

const emptyForm = { name: "", email: "", password: "", phone: "", role: "CAMPING" };

export function StaffList({ initialItems }: { initialItems: AdminUser[] }) {
  return (
    <CollectionList
      title="Utilisateurs"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="userId"
      titleKey="name"
      items={initialItems}
      columns={columns}
    />
  );
}

export function StaffEditor({ id, initialData }: { id?: string; initialData?: AdminUser }) {
  return (
    <CollectionEditor
      collectionLabel="Utilisateurs"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      createPath={CREATE_PATH}
      id={id}
      initialData={initialData ?? emptyForm}
      fields={fields}
    />
  );
}
