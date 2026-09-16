import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // NOTE: serving under the /connect sub-path needs `basePath: '/connect'`, but
  // that breaks every hardcoded `/api/...` fetch (Next doesn't prefix fetch),
  // which 404s the whole app. Left off until we either prefix all API calls or
  // switch to a dedicated sub-domain (connect.au.edu) — see DEPLOYMENT.md.
  // basePath: '/connect',
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
