import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Served under /connect everywhere — locally (localhost:3000/connect) and in
  // production (life.au.edu/connect) — so dev mirrors prod exactly. Client
  // fetch() calls and /public assets are prefixed via lib/basePath.ts.
  basePath: '/connect',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
      {
        protocol: "https",
        hostname: "graph.microsoft.com",
      },
      {
        protocol: "https",
        hostname: "avatar.microsoft.com",
      },
      // blob storage allow
      {
        protocol: "https",
        hostname: "aucstorage.blob.core.windows.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
