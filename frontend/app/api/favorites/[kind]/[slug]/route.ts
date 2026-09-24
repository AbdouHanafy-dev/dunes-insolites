import { getSession } from "@/lib/session";
import { setMyFavorite } from "@/lib/api";

const TYPES: Record<string, string> = { tour: "TOUR", stay: "STAY", activity: "ACTIVITY" };

type Ctx = { params: Promise<{ kind: string; slug: string }> };

async function handle(method: "PUT" | "DELETE", { params }: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not logged in." }, { status: 401 });

  const { kind, slug } = await params;
  const type = TYPES[kind];
  if (!type) return Response.json({ error: "Unknown kind." }, { status: 400 });

  const ok = await setMyFavorite(session.accessToken, type, slug, method === "PUT");
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "Could not update favourites." }, { status: 502 });
}

export const PUT = (_req: Request, ctx: Ctx) => handle("PUT", ctx);
export const DELETE = (_req: Request, ctx: Ctx) => handle("DELETE", ctx);
