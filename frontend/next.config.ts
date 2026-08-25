import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },

  // @dunes/api-types is a workspace package published as raw TypeScript —
  // there is no build step because it is the contract, not a library. Next
  // has to compile it rather than expecting pre-built JS.
  transpilePackages: ["@dunes/api-types"],
  // The dev-only route indicator (bottom-left) has no effect on production
  // builds, but it sits in the same corner as real UI during local review.
  devIndicators: false,
};

export default nextConfig;
