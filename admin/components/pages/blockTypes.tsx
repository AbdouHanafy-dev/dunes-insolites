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
  /** Bootstrap Icons class name. */
  icon: string;
  fields: FieldDef[];
  /** Which key in the block's data holds the human title shown on the collapsed card. */
  titleKey?: string;
};

export const BLOCK_TYPES: BlockTypeDef[] = [
  {
    type: "hero",
    label: "Hero",
    icon: "bi-card-image",
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
    icon: "bi-text-paragraph",
    titleKey: "heading",
    fields: [
      { type: "text", key: "heading", label: "Titre de section (optionnel)" },
      { type: "textarea", key: "content", label: "Contenu" },
    ],
  },
  {
    type: "cta",
    label: "Appel à l'action",
    icon: "bi-megaphone",
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
    icon: "bi-question-circle",
    titleKey: "question",
    fields: [
      { type: "text", key: "question", label: "Question", required: true },
      { type: "textarea", key: "answer", label: "Réponse" },
    ],
  },
  {
    type: "accommodationShowcase",
    label: "Vitrine hébergements",
    icon: "bi-house-heart",
    fields: [], // rendered specially in PageBuilder.tsx with a real TourType picker
  },
  {
    type: "blockReference",
    label: "Bloc réutilisable",
    icon: "bi-boxes",
    fields: [], // rendered specially in BlockFieldsEditor.tsx with a picker over /api/content-blocks
  },
  {
    type: "steps",
    label: "Étapes (« Comment ça marche »)",
    icon: "bi-list-ol",
    titleKey: "eyebrow",
    fields: [
      { type: "text", key: "eyebrow", label: "Kicker" },
      {
        type: "repeater",
        key: "items",
        label: "Étapes",
        itemLabel: "Étape",
        fields: [
          { type: "text", key: "title", label: "Titre", required: true },
          { type: "textarea", key: "body", label: "Texte" },
        ],
      },
    ],
  },
  {
    type: "bookDirect",
    label: "Réservez en direct",
    icon: "bi-currency-euro",
    titleKey: "eyebrow",
    // Deliberately no field for the discount percentage or its headline -
    // that figure is tied to the real prices in the catalogue (see
    // frontend/components/BookDirect.tsx's own comment on
    // DIRECT_DISCOUNT) and stays code-owned so an editor can never publish
    // a saving that doesn't match what guests are actually charged.
    fields: [
      { type: "text", key: "eyebrow", label: "Kicker" },
      { type: "textarea", key: "lead", label: "Texte d'intro" },
      { type: "text", key: "ctaLabel", label: "Bouton — libellé" },
      { type: "text", key: "headingHere", label: "Titre de la liste d'avantages" },
      {
        type: "repeater",
        key: "advantages",
        label: "Avantages",
        itemLabel: "Avantage",
        fields: [{ type: "text", key: "text", label: "Texte", required: true }],
      },
    ],
  },
  {
    type: "team",
    label: "Équipe",
    icon: "bi-people",
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

export function blockPreviewLabel(
  type: string,
  dataJson: string,
  contentBlocks: { blockId: string; label: string }[] = [],
): string {
  const def = blockTypeDef(type);
  if (!def) return type;
  if (type === "accommodationShowcase") {
    const data = parseBlockData(dataJson);
    const ids = (data.tourTypeIds as string[] | undefined) ?? [];
    return `${ids.length} hébergement(s) sélectionné(s)`;
  }
  if (type === "blockReference") {
    const data = parseBlockData(dataJson);
    const blockId = data.blockId as string | undefined;
    const referenced = contentBlocks.find((b) => b.blockId === blockId);
    return referenced ? referenced.label : "(aucun bloc choisi)";
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
