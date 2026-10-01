import type { Tour } from "@/lib/types";

export const GUIDE_TYPE_KEYS = {
  NONE: "guideNone",
  TOUR_GUIDE: "guideTour",
  RECEPTION_STAFF: "guideReception",
  INSTRUCTOR: "guideInstructor",
  DRIVER: "guideDriver",
} as const satisfies Record<NonNullable<Tour["guideType"]>, string>;

export const MEAL_TYPE_KEYS = {
  BREAKFAST: "mealBreakfast",
  LUNCH: "mealLunch",
  DINNER: "mealDinner",
  SNACK: "mealSnack",
} as const satisfies Record<NonNullable<Tour["meals"][number]["mealType"]>, string>;

export const MEAL_FORMAT_KEYS = {
  BUFFET: "formatBuffet",
  SET_MENU: "formatSetMenu",
  ALA_CARTE: "formatAlaCarte",
  PICNIC: "formatPicnic",
} as const satisfies Record<NonNullable<Tour["meals"][number]["format"]>, string>;

const GROUP_SIZE_KEYS = {
  "small group": "groupSmall",
  "medium group": "groupMedium",
  "any group size": "groupAny",
  private: "groupPrivate",
} as const;

type GroupSizeKey = (typeof GROUP_SIZE_KEYS)[keyof typeof GROUP_SIZE_KEYS];

/**
 * The public API currently exposes group size as legacy English display copy.
 * Keep the wire value compatible, but never print that English copy directly
 * in a translated interface.
 */
export function groupSizeKey(value?: string | null): GroupSizeKey | null {
  if (!value) return null;
  return GROUP_SIZE_KEYS[value.trim().toLowerCase() as keyof typeof GROUP_SIZE_KEYS] ?? null;
}
