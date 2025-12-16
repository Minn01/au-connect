import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
