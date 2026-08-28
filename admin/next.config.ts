import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
