import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/fotbal", destination: "/tym", permanent: true },
      { source: "/sokolovna", destination: "/plan-akci", permanent: true },
      { source: "/budoucnost", destination: "/plan-akci", permanent: true },
      { source: "/akce", destination: "/plan-akci", permanent: true },
    ];
  },
};

export default nextConfig;
