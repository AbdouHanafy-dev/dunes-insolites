"use client";

import UserCards from "@/components/crud/UserCards";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { FieldDef } from "@/components/payload/fields";
import type { AdminUser } from "@/lib/api";
import { optionsFrom } from "@/lib/tableFilters";

const BASE_PATH = "/clients";
const API_PATH = "users";
const CREATE_PATH = "users/add";


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
    <UserCards
      title="Clients & Partenaires"
      basePath={BASE_PATH}
      items={initialItems}
      roleLabel={(user) => (user.role === "PARTENAIRE" ? "Partenaire" : user.role === "CLIENT" ? "Client" : user.role)}
      extraFilters={[
        { id: "tier", label: "Fidélité", kind: "select", options: optionsFrom(initialItems, (u) => u.loyaltyTier), get: (u) => u.loyaltyTier },
        { id: "terms", label: "CGU acceptées", kind: "date", get: (u) => u.termsAcceptedAt },
      ]}
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
