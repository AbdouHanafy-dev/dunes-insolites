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
