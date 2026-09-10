import { seedRouteDisabled } from "@/lib/seedGuard";
// Local dev/no-backend stand-in for PublicContactController
// (POST /api/public/contact) - lib/api.ts's sendContact() only calls this
// route when NEXT_PUBLIC_API_URL is unset (no real backend configured, per
// this app's own "everything through lib/api.ts, seed-data fallback"
// convention - see ARCHITECTURE.md §6.2). With a real backend configured,
// the message is really emailed to the business inbox; here, there's
// nothing to forward to, so it just validates and no-ops. This used to
// silently no-op even with NEXT_PUBLIC_API_URL set, which was the real bug
// (SEO/vitrine audit) - fixed by giving sendContact() a real backend path
// to call, not by making this local stub do anything - it's the same
// intentional placeholder every other local API route in this folder is.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const _seedOff = seedRouteDisabled();
  if (_seedOff) return _seedOff;
  let body: { name?: string; email?: string; subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const errors: Record<string, string> = {};
  if (!body.name?.trim()) errors.name = "Tell us who you are.";
  if (!body.email?.trim()) errors.email = "We need an email to reply to.";
  else if (!EMAIL.test(body.email.trim())) errors.email = "That email looks off.";
  if (!body.message?.trim()) errors.message = "Say a little about your trip.";
  else if (body.message.trim().length < 10) errors.message = "A few more words, please.";

  if (Object.keys(errors).length) {
    return Response.json({ errors }, { status: 422 });
  }

  // No backend configured in this environment - nothing to forward to.
  return Response.json({ ok: true }, { status: 201 });
}
