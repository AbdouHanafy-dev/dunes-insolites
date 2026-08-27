import { notFound } from "next/navigation";

/**
 * Catches any URL under a locale that doesn't match a real route (e.g.
 * /de/this-page-does-not-exist/). Without this, Next.js can't match the
 * path to anything inside app/[locale]/*, so it falls straight to its
 * built-in default 404 page instead of the translated one at
 * app/[locale]/not-found.tsx — that file only ever catches an explicit
 * notFound() call from within an already-matched route, not a genuinely
 * unmatched URL. This route exists purely to be matched and immediately
 * hand off to that not-found page, in the right locale.
 */
export default function CatchAll() {
  notFound();
}
