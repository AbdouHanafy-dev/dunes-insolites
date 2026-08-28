"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { ColumnDef, FieldDef } from "@/components/payload/fields";
import type { AdminUser } from "@/lib/api";

const BASE_PATH = "/clients";
const API_PATH = "users";
const CREATE_PATH = "users/add";

const columns: ColumnDef<AdminUser>[] = [
  { key: "name", label: "Nom" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Téléphone" },
  { key: "role", label: "Type" },
  { key: "matriculeFiscal", label: "Matricule fiscal", render: (item) => item.matriculeFiscal || "—" },
];

const fields: FieldDef[] = [
  { type: "text", key: "name", label: "Nom", required: true },
  { type: "text", key: "email", label: "Email", required: true },
  { type: "text", key: "password", label: "Mot de passe", hint: "vide = généré automatiquement" },
  { type: "text", key: "phone", label: "Téléphone" },
  {
    type: "select",
    key: "role",
    label: "Type de compte",
    options: [
      { value: "CLIENT", label: "Client" },
      { value: "PARTENAIRE", label: "Partenaire" },
    ],
  },
  { type: "text", key: "matriculeFiscal", label: "Matricule fiscal", hint: "partenaires uniquement" },
  { type: "text", key: "agencyAddress", label: "Adresse agence", hint: "partenaires uniquement" },
];

const emptyForm = { name: "", email: "", password: "", phone: "", role: "CLIENT" };

export function ClientsList({ initialItems }: { initialItems: AdminUser[] }) {
  return (
    <CollectionList
      title="Clients & Partenaires"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="userId"
      titleKey="name"
      items={initialItems}
      columns={columns}
    />
  );
}

export function ClientEditor({ id, initialData }: { id?: string; initialData?: AdminUser }) {
  return (
    <CollectionEditor
      collectionLabel="Clients & Partenaires"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      createPath={CREATE_PATH}
      id={id}
      initialData={initialData ?? emptyForm}
      fields={fields}
    />
  );
}
