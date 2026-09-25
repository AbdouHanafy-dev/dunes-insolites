export const MIN_TOUR_HOURS = 1;
export const MAX_TOUR_HOURS = 744;

/** Why a raw duration input is not acceptable, or null when it is. */
export function tourHoursError(raw: string): string | null {
  const value = raw.trim();
  if (value === "") return "La durée est obligatoire.";
  if (!/^-?\d+$/.test(value)) return "Saisissez un nombre entier d'heures.";
  const hours = Number(value);
  if (hours < MIN_TOUR_HOURS) return "La durée doit être d'au moins 1 heure.";
  if (hours > MAX_TOUR_HOURS) return `La durée ne peut pas dépasser ${MAX_TOUR_HOURS} heures (un mois).`;
  return null;
}

/** Same wording the site shows in French: 26 -> "1 jour et 2 h (26 h)". */
export function tourDurationLabel(hours: number): string {
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  if (days === 0) return `${hours} h`;
  const d = `${days} ${days > 1 ? "jours" : "jour"}`;
  return `${rest === 0 ? d : `${d} et ${rest} h`} (${hours} h)`;
}
