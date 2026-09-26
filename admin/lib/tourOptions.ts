/** What kind of paid option this is: the special "another return city" one, or an ordinary upgrade. */
export function optionKindLabel(serviceType: string | null | undefined): string {
  return serviceType === "RETURN_CITY" ? "Autre ville de retour" : "Amélioration";
}

const UNIT_LABELS: Record<string, string> = {
  PER_PERSON_NIGHT: "par personne et par nuit",
  PER_PERSON: "par personne",
  PER_BOOKING: "une seule fois",
  PER_DAY: "par jour",
};

/** "30 € par personne et par nuit". */
export function optionPriceLabel(price: number | null | undefined, unit: string | null | undefined): string {
  const amount = price ?? 0;
  const suffix = unit ? UNIT_LABELS[unit] : undefined;
  return `${amount} €${suffix ? ` ${suffix}` : ""}`;
}

/** An address-safe identifier from a title: "Passer en suite !" -> "passer-en-suite". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
