import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Served under the /connect sub-path of life.au.edu. Next prefixes pages,
  // assets, <Link>, <Image> and the router automatically; client fetch() calls
  // are prefixed by installApiBasePath() in lib/client/apiBasePath.ts (keep the
  // BASE_PATH there in sync with this value).
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
