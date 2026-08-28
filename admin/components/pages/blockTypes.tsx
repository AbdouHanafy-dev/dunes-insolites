import type { FieldDef } from "@/components/payload/fields";

/**
 * Known block types and their editable fields — the page builder from the
 * brief. Each block's actual content lives in Page.dataJson (a flexible
 * JSON string, see backend model.PageBlock); this registry is what turns
 * that raw JSON into real typed fields per block type instead of a bare
 * textarea. "accommodationShowcase" is the one relationship block wired to
 * real catalogue data (TourType) rather than invented content — the exact
 * "content blocks reference real catalogue entities" requirement from the
 * brief. Types not listed here still work (generic JSON editor fallback in
 * PageBuilder.tsx), just without typed fields yet.
 */
export type BlockTypeDef = {
  type: string;
  label: string;
  icon: string;
  fields: FieldDef[];
  /** Which key in the block's data holds the human title shown on the collapsed card. */
  titleKey?: string;
};

export const BLOCK_TYPES: BlockTypeDef[] = [
  {
    type: "hero",
    label: "Hero",
    icon: "🖼️",
    titleKey: "title",
    fields: [
      { type: "text", key: "title", label: "Titre", required: true },
      { type: "text", key: "subtitle", label: "Sous-titre" },
      { type: "text", key: "imageUrl", label: "Image (URL)" },
      { type: "text", key: "ctaLabel", label: "Bouton — libellé" },
      { type: "text", key: "ctaUrl", label: "Bouton — lien" },
    ],
  },
  {
    type: "richText",
    label: "Texte riche",
    icon: "📝",
    titleKey: "heading",
    fields: [
      { type: "text", key: "heading", label: "Titre de section (optionnel)" },
      { type: "textarea", key: "content", label: "Contenu" },
    ],
  },
  {
    type: "cta",
    label: "Appel à l'action",
    icon: "📣",
    titleKey: "title",
    fields: [
      { type: "text", key: "title", label: "Titre", required: true },
      { type: "text", key: "buttonLabel", label: "Bouton — libellé" },
      { type: "text", key: "buttonUrl", label: "Bouton — lien" },
    ],
  },
  {
    type: "faq",
    label: "FAQ",
    icon: "❓",
    titleKey: "question",
    fields: [
      { type: "text", key: "question", label: "Question", required: true },
      { type: "textarea", key: "answer", label: "Réponse" },
    ],
  },
  {
    type: "accommodationShowcase",
    label: "Vitrine hébergements",
    icon: "🏕️",
    fields: [], // rendered specially in PageBuilder.tsx with a real TourType picker
  },
  {
    type: "team",
    label: "Équipe",
    icon: "🧑‍🤝‍🧑",
    titleKey: "heading",
    fields: [
      { type: "text", key: "heading", label: "Titre de la section" },
      {
        type: "repeater",
        key: "members",
        label: "Membres",
        itemLabel: "Membre",
        fields: [
          { type: "text", key: "name", label: "Nom", required: true },
          { type: "text", key: "role", label: "Rôle" },
          { type: "text", key: "photo", label: "Photo (URL)" },
          { type: "textarea", key: "bio", label: "Bio" },
        ],
      },
    ],
  },
];

export function blockTypeDef(type: string): BlockTypeDef | undefined {
  return BLOCK_TYPES.find((b) => b.type === type);
}

export function parseBlockData(dataJson: string): Record<string, unknown> {
  try {
    return JSON.parse(dataJson || "{}");
  } catch {
    return {};
  }
}

export function blockPreviewLabel(type: string, dataJson: string): string {
  const def = blockTypeDef(type);
  if (!def) return type;
  if (type === "accommodationShowcase") {
    const data = parseBlockData(dataJson);
    const ids = (data.tourTypeIds as string[] | undefined) ?? [];
    return `${ids.length} hébergement(s) sélectionné(s)`;
  }
  if (type === "team") {
    const data = parseBlockData(dataJson);
    const members = (data.members as unknown[] | undefined) ?? [];
    const heading = data.heading as string | undefined;
    return heading || `${members.length} membre(s)`;
  }
  if (type === "richText") {
    const data = parseBlockData(dataJson);
    const heading = data.heading as string | undefined;
    if (heading) return heading;
    const content = (data.content as string | undefined) ?? "";
    return content.slice(0, 48) || "(vide)";
  }
  const data = parseBlockData(dataJson);
  const title = def.titleKey ? (data[def.titleKey] as string | undefined) : undefined;
  return title || "(vide)";
}
