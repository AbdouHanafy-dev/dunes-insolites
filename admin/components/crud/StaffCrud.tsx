"use client";

import UserCards from "@/components/crud/UserCards";
import CollectionEditor from "@/components/payload/CollectionEditor";
import type { FieldDef } from "@/components/payload/fields";
import type { AdminUser, CustomRole } from "@/lib/api";

// Staff accounts (ADMIN/CAMPING/STAFF) — distinct from the Clients &
// Partenaires list (/clients), which defaults to CLIENT/PARTENAIRE. Same
// /api/users endpoints, scoped by the roles this list requests and offers.
const BASE_PATH = "/administration/utilisateurs";
const API_PATH = "users";
const CREATE_PATH = "users/add";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  CAMPING: "Camping",
  STAFF: "Rôle personnalisé",
  CHAUFFEUR: "Chauffeur",
};


// customRoleName is always in the form (not conditionally shown — the
// generic FieldDef/CollectionEditor system has no "only if role=X" concept,
// see StaffEditor's own comment), but only ever read/written by the backend
// when role = STAFF (KeycloakUserSyncService.requireValidCustomRoleIfStaff).
function buildFields(customRoles: CustomRole[]): FieldDef[] {
  return [
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
        { value: "STAFF", label: "Rôle personnalisé" },
      ],
    },
    {
      type: "select",
      key: "customRoleName",
      label: "Rôle personnalisé",
      hint:
        customRoles.length === 0
          ? "Aucun rôle personnalisé créé — voir Administration > Rôles personnalisés"
          : "Uniquement pris en compte si Rôle = \"Rôle personnalisé\" ci-dessus",
      options: [
        { value: "", label: "—" },
        ...customRoles.map((r) => ({ value: r.name, label: r.label })),
      ],
    },
  ];
}

const emptyForm = { name: "", email: "", password: "", phone: "", role: "CAMPING", customRoleName: "" };

export function StaffList({ initialItems }: { initialItems: AdminUser[] }) {
  return (
    <UserCards
      title="Utilisateurs"
      basePath={BASE_PATH}
      items={initialItems}
      roleLabel={(user) => (user.role === "STAFF" ? `Personnalisé (${user.customRoleName ?? "—"})` : ROLE_LABELS[user.role] ?? user.role)}
    />
  );
}

export function StaffEditor({
  id,
  initialData,
  customRoles,
}: {
  id?: string;
  initialData?: AdminUser;
  customRoles: CustomRole[];
}) {
  return (
    <CollectionEditor
      collectionLabel="Utilisateurs"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      createPath={CREATE_PATH}
      id={id}
      initialData={initialData ?? emptyForm}
      fields={buildFields(customRoles)}
    />
  );
}
