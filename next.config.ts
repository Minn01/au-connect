import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Next prefixes page navigation and managed assets. Browser fetch() uses
  // the public API paths defined in lib/constants.ts.
  basePath: '/connect',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/connect',
        basePath: false,
        permanent: true,
      },
    ];
  },
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
