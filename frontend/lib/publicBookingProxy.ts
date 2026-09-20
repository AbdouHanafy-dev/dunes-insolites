import { BACKEND_BASE, backendConfigured } from "@/lib/authProxy";
import { getSession } from "@/lib/session";

export async function proxyPublicBooking(req: Request, backendPath: string): Promise<Response | null> {
  if (!backendConfigured()) return null;

  const body = await req.text();
  const session = await getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  // Production nginx overwrites X-Real-IP with the TCP peer before the
  // request reaches Next. Preserve that trusted value so the backend's
  // per-client limiter does not collapse every BFF request onto one IP.
  const realIp = req.headers.get("x-real-ip");
  if (realIp) headers["X-Real-IP"] = realIp;

  try {
    const upstream = await fetch(`${BACKEND_BASE}${backendPath}`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ error: "Booking service is temporarily unavailable." }, { status: 502 });
  }
}
