/**
 * The `app/api/*` route handlers for catalogue / gallery / reviews / bookings
 * are LOCAL DEVELOPMENT STAND-INS for the real backend — they serve or accept
 * seed data. On a real deployment (`NEXT_PUBLIC_API_URL` set) `lib/api.ts` talks
 * to the backend directly and never touches these, but the routes still exist
 * on the deployed server and would hand seed JSON to anyone who hits them.
 *
 * This guard disables them unless seed fallback is explicitly opted into — the
 * same switch `lib/api.ts` uses. Fail closed: no opt-in, no seed endpoint.
 */
export const seedFallbackEnabled =
  process.env.ALLOW_SEED_FALLBACK === "true" ||
  process.env.NEXT_PUBLIC_ALLOW_SEED_FALLBACK === "true";

/** Returns a 503 Response to short-circuit with, or null when seed routes are allowed. */
export function seedRouteDisabled(): Response | null {
  if (seedFallbackEnabled) return null;
  return Response.json(
    {
      error:
        "This endpoint serves local development seed data and is disabled on this deployment. " +
        "Set NEXT_PUBLIC_API_URL to a real backend (or ALLOW_SEED_FALLBACK=true for local dev).",
    },
    { status: 503 },
  );
}
