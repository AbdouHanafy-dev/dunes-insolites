import { seedRouteDisabled } from "@/lib/seedGuard";
// Local dev/no-backend stand-in for PublicNewsletterController
// (POST /api/public/subscribe) - see app/api/contact/route.ts's own
// comment, same reasoning exactly. With a real backend configured, the
// email is really stored (NewsletterSubscriber table); here there's
// nowhere to store it, so it just validates and no-ops.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const _seedOff = seedRouteDisabled();
  if (_seedOff) return _seedOff;
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  if (!EMAIL.test(email)) {
    return Response.json({ errors: { email: "That email looks off." } }, { status: 422 });
  }

  // No backend configured in this environment - nothing to store this in,
  // and so no real `position` (subscriber count) to report either - the
  // caller (MaintenanceNotifyForm) treats it as optional and simply omits
  // the "you're #N on the list" line rather than showing an invented number.
  return Response.json({ ok: true, email }, { status: 201 });
}
