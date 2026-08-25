const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
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

  // TODO: forward to the inbox / CRM.
  return Response.json({ ok: true }, { status: 201 });
}
