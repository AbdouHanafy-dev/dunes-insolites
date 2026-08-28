import { backendConfigured, backendLogin } from "@/lib/authProxy";

export async function POST(request: Request) {
  if (!backendConfigured()) {
    return Response.json(
      { error: "Backend not configured — set NEXT_PUBLIC_API_URL." },
      { status: 501 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const result = await backendLogin(body.email, body.password);

  if (!result.ok) {
    return Response.json({ error: result.message }, { status: result.status });
  }

  const { id, name, email, role } = result;
  return Response.json({ id, name, email, role });
}
