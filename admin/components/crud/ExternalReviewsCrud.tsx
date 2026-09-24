"use client";

import CollectionList from "@/components/payload/CollectionList";
import CollectionEditor from "@/components/payload/CollectionEditor";
import { inputClass, labelClass, type ColumnDef, type FieldDef } from "@/components/payload/fields";
import type { AdminExternalReview, AdminReviewPlatform } from "@/lib/api";

const BASE_PATH = "/content/avis-externes";
const API_PATH = "external-reviews";

/** Sentinel value of the platform select meaning "a platform not in the list yet". */
const NEW_PLATFORM = "__new__";
const DEFAULT_NEW_COLOR = "#6b7280";

/** A platform's name in its own colour, as a small pill. */
export function PlatformChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ color, backgroundColor: `${color}1f` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

const columns: ColumnDef<AdminExternalReview>[] = [
  { key: "authorName", label: "Voyageur" },
  {
    key: "platformName",
    label: "Plateforme",
    render: (r) => <PlatformChip name={r.platformName} color={r.platformColor} />,
  },
  { key: "rating", label: "Note", render: (r) => `${r.rating}/5` },
  { key: "reviewDate", label: "Date" },
  { key: "published", label: "Publié", render: (r) => (r.published ? "Oui" : "Non") },
];

export function ExternalReviewsList({ initialItems }: { initialItems: AdminExternalReview[] }) {
  return (
    <CollectionList
      title="Avis Google & autres plateformes"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      idKey="externalReviewId"
      titleKey="authorName"
      items={initialItems}
      columns={columns}
    />
  );
}

export function ExternalReviewEditor({
  id,
  initialData,
  platforms,
}: {
  id?: string;
  initialData?: AdminExternalReview;
  platforms: AdminReviewPlatform[];
}) {
  const fields: FieldDef[] = [
    { type: "text", key: "authorName", label: "Nom du voyageur", required: true, hint: "tel qu’affiché sur la plateforme, ex. « Marie-Paule C. »" },
    {
      type: "select",
      key: "platformId",
      label: "Plateforme",
      options: [
        ...platforms.map((p) => ({ value: p.platformId, label: p.name })),
        { value: NEW_PLATFORM, label: "➕ Autre plateforme (nouvelle)…" },
      ],
    },
    { type: "number", key: "rating", label: "Note (1 à 5)", required: true, step: 1 },
    { type: "date", key: "reviewDate", label: "Date de l’avis", required: true, hint: "si vous ne connaissez pas le jour, prenez le 1er du mois" },
    { type: "text", key: "country", label: "Pays (optionnel)", hint: "seulement si la plateforme l’affiche" },
    { type: "text", key: "tripType", label: "Type de voyage (optionnel)", hint: "tel qu’affiché, ex. « Vacances · Amis »" },
    { type: "text", key: "title", label: "Titre (optionnel)", hint: "seulement si l’avis en a un" },
    {
      type: "textarea",
      key: "body",
      label: "Avis du voyageur",
      hint: "copiez-le EXACTEMENT comme il l’a écrit, dans sa langue — ne le traduisez pas, ne le raccourcissez pas, ne le corrigez pas",
    },
    { type: "text", key: "sourceUrl", label: "Lien vers l’avis (optionnel)", hint: "URL de l’avis sur la plateforme" },
    {
      type: "textarea",
      key: "ownerReply",
      label: "Réponse du propriétaire (optionnel)",
      hint: "votre réponse publique sur la plateforme, copiée telle quelle",
    },
    { type: "date", key: "ownerReplyDate", label: "Date de la réponse (optionnel)" },
    { type: "checkbox", key: "published", label: "Publié sur le site" },
  ];

  const initial: Record<string, unknown> = initialData
    ? { ...initialData }
    : {
        authorName: "",
        platformId: platforms[0]?.platformId ?? NEW_PLATFORM,
        newPlatformName: "",
        newPlatformColor: DEFAULT_NEW_COLOR,
        rating: 5,
        reviewDate: "",
        country: "",
        tripType: "",
        title: "",
        body: "",
        sourceUrl: "",
        ownerReply: "",
        ownerReplyDate: null,
        published: true,
      };

  return (
    <CollectionEditor
      collectionLabel="Avis Google & autres plateformes"
      basePath={BASE_PATH}
      apiPath={API_PATH}
      id={id}
      initialData={initial}
      fields={fields}
      titleKey="authorName"
      toRequestBody={(form) => {
        const isNew = form.platformId === NEW_PLATFORM;
        return {
          ...form,
          platformId: isNew ? null : form.platformId,
          newPlatformName: isNew ? form.newPlatformName : null,
          newPlatformColor: isNew ? form.newPlatformColor : null,
        };
      }}
      extraSection={(form, patch) =>
        form.platformId === NEW_PLATFORM ? (
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-navy-800">Nouvelle plateforme</h2>
              <p className="mt-1 text-[13px] text-navy-700/60">
                Elle sera ajoutée à la liste et gardera sa couleur pour tous ses avis.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="newPlatformName" className={labelClass}>Nom de la plateforme</label>
                <input
                  id="newPlatformName"
                  type="text"
                  required
                  maxLength={80}
                  placeholder="ex. Viator"
                  className={inputClass}
                  value={String(form.newPlatformName ?? "")}
                  onChange={(e) => patch({ newPlatformName: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="newPlatformColor" className={labelClass}>Couleur</label>
                <div className="flex items-center gap-3">
                  <input
                    id="newPlatformColor"
                    type="color"
                    className="h-10 w-16 cursor-pointer rounded-[9px] border border-navy-700/15 bg-white p-1"
                    value={String(form.newPlatformColor ?? DEFAULT_NEW_COLOR)}
                    onChange={(e) => patch({ newPlatformColor: e.target.value })}
                  />
                  <PlatformChip
                    name={String(form.newPlatformName || "Aperçu")}
                    color={String(form.newPlatformColor ?? DEFAULT_NEW_COLOR)}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
    />
  );
}
