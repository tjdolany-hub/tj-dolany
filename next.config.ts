import type { NextConfig } from "next";

// Content-Security-Policy. Uses 'unsafe-inline' for scripts/styles because Next
// injects an inline hydration/theme bootstrap and Tailwind/framer-motion emit
// inline styles (a nonce-based policy would require middleware plumbing). The
// allow-list covers the only third parties the site loads: Supabase (storage +
// realtime), YouTube embeds, and the Google Maps iframe.
// Next.js dev mode (Turbopack HMR + React dev tooling) requires eval(); production
// never uses it, so 'unsafe-eval' is added only in development to keep prod strict.
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://i.ytimg.com https://*.ytimg.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com https://maps.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
      { source: "/historie", destination: "/o-klubu", permanent: true },
      { source: "/o-nas", destination: "/o-klubu", permanent: true },
    ];
  },
};

export default nextConfig;
