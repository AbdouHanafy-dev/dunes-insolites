import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware replacements for next/link, next/navigation's router/
 * usePathname, and redirect — every one of these automatically prefixes
 * (or doesn't, for the default French locale) with the current locale.
 * Use these instead of the plain next/* versions anywhere a link needs to
 * stay in the current language.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
