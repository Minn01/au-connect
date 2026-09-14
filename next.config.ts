import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Served under the /connect sub-path of the life.au.edu super-app.
  // Next auto-prefixes all pages, assets, <Link>s and the middleware matcher.
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
