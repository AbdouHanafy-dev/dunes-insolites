/**
 * The base URL of the Spring Boot backend. NEXT_PUBLIC_API_URL already
 * includes the backend's own `/api` prefix (same convention as
 * frontend/lib/api.ts). Used by the BFF proxy routes to forward the
 * session's bearer token server-to-server.
 *
 * Login itself is the OIDC Authorization-Code flow — see lib/oidc.ts and
 * app/api/auth/*.
 */
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export { BASE as BACKEND_BASE };

/**
 * Who is really on the other end of a proxied call. The backend only sees this app's
 * container, so without these two headers its activity log would record the same
 * internal address and no device for every action. nginx sets X-Real-IP from the TCP
 * peer and overwrites any client-supplied value, which is why it is the one trusted.
 */
export function forwardedClientHeaders(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  const ip = request.headers.get("x-real-ip");
  if (ip) out["X-Real-IP"] = ip;
  const agent = request.headers.get("user-agent");
  if (agent) out["User-Agent"] = agent;
  return out;
}
