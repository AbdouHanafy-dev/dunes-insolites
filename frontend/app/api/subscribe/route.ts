const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
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

  // TODO: push to the mailing-list provider.
  return Response.json({ ok: true, email }, { status: 201 });
}
