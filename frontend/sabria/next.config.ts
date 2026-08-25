import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },
  // The dev-only route indicator (bottom-left) has no effect on production
  // builds, but it sits in the same corner as real UI during local review.
  devIndicators: false,
};

export default nextConfig;
