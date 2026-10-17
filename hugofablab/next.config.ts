import type { NextConfig } from "next";

/**
 * Origines autorisées pour les Server Actions. Elles doivent rester exactes : un wildcard
 * partagé (par exemple *.vercel.app) permettrait à d'autres sites hébergés d'envoyer des actions.
 * En production, définissez APP_URL et ALLOWED_ORIGINS avec les domaines réellement utilisés.
 */
const exactHost = (value?: string) => value?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
const allowedOrigins = [
  "localhost:3000",
  "127.0.0.1:3000",
  exactHost(process.env.APP_URL),
  exactHost(process.env.VERCEL_URL),
  exactHost(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  ...(process.env.ALLOWED_ORIGINS ?? "")
    .split(",").map(exactHost)
    .filter(Boolean),
].filter((host): host is string => Boolean(host));

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins,
      bodySizeLimit: "12mb", // téléversement de la photo du FabManager (3 Mo max côté application)
    },
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      ],
    }];
  },
};

export default nextConfig;
