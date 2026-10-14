import type { NextConfig } from "next";

/**
 * Origines autorisées pour les Server Actions.
 * Derrière un proxy (aperçu e2b, Vercel, nginx), l'en-tête `x-forwarded-host` peut différer de l'`Origin`
 * du navigateur ; sans cette liste, Next.js rejette les formulaires (« Invalid Server Actions request »).
 * En production, ajoutez votre domaine via ALLOWED_ORIGINS="fablab.votredomaine.tg,www.fablab.votredomaine.tg".
 */
const allowedOrigins = [
  "localhost:3000",
  "127.0.0.1:3000",
  "*.e2b.app",
  "*.e2b.dev",
  "*.vercel.app",
  ...(process.env.APP_URL ? [process.env.APP_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "")] : []),
  ...(process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/^https?:\/\//, "").replace(/\/+$/, ""))
    .filter(Boolean),
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins,
      bodySizeLimit: "12mb", // téléversement de la photo du FabManager (3 Mo max côté application)
    },
  },
};

export default nextConfig;
