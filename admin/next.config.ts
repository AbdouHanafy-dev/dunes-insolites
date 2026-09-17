import path from "node:path";
import type { NextConfig } from "next";

const frontendOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000").origin;
  } catch {
    return "'self'";
  }
})();
// Uploaded media (MediaLibrary, and the Tour wizard's cover/gallery
// previews) is rendered via a plain <img src="..."> pointing straight at
// the backend's own absolute URL (MediaController#absolute) - in
// production that's api.dunesinsolites.com, a different origin from
// admin.dunesinsolites.com. Without this, img-src 'self' silently blocks
// every one of those thumbnails (found live: naturalWidth stayed 0).
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090/api").origin;
  } catch {
    return "'self'";
  }
})();
const isDev = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' ${apiOrigin} data: blob:`,
  "font-src 'self' data:",
  "connect-src 'self'",
  `frame-src ${frontendOrigin}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // Lean container image — copies only the traced runtime files. The tracing
  // root must be the monorepo root so hoisted deps + @dunes/api-types are
  // included. See backend/docker-compose.vps.yml.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  turbopack: {
    // Must be the monorepo root — `npm install` (root command) hoists `next`
    // into the root node_modules. See frontend/next.config.ts for the same
    // fix and why pointing this at __dirname breaks dev/build outright.
    root: path.join(__dirname, ".."),
  },
  // @dunes/api-types is a workspace package published as raw TypeScript —
  // no build step, Next compiles it directly.
  transpilePackages: ["@dunes/api-types"],
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
