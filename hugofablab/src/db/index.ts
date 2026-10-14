import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Connexion PostgreSQL pensée pour Vercel / Supabase :
 * - un seul client par instance serverless (évite l'épuisement des connexions) ;
 * - SSL automatique pour les bases distantes ;
 * - URL de secours qui échoue vite : l'application affiche une erreur contrôlée au lieu de planter au chargement du module.
 */
export const databaseUrl = process.env.DATABASE_URL?.trim();
export const databaseConfigured = Boolean(databaseUrl);
const fallbackUrl = "postgresql://invalid:invalid@127.0.0.1:1/hugo_fablab_unconfigured";
const connectionUrl = databaseUrl || fallbackUrl;

const globalForDb = globalThis as typeof globalThis & {
  __hugoFablabPgPool?: Pool;
};

const remoteHost = !/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(connectionUrl);
const needsSsl = process.env.DATABASE_SSL === "require" || (process.env.DATABASE_SSL !== "disable" && remoteHost);
const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const pool =
  globalForDb.__hugoFablabPgPool ??
  new Pool({
    connectionString: connectionUrl,
    // Chaque invocation Vercel peut devenir une instance distincte : 1 connexion par instance est sûr.
    max: serverless ? 1 : 5,
    idleTimeoutMillis: serverless ? 8_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

// Le cache global vaut aussi en production : il permet à une invocation Vercel réutilisée de ne pas rouvrir de pool.
globalForDb.__hugoFablabPgPool = pool;

export const db = drizzle(pool);

/** Informations non sensibles, utilisables par le endpoint de diagnostic protégé. */
export function databaseInfo() {
  if (!databaseUrl) return { configured: false, host: null };
  try {
    const url = new URL(databaseUrl);
    return { configured: true, host: url.host, ssl: needsSsl, serverless };
  } catch {
    return { configured: true, host: "format invalide", ssl: needsSsl, serverless };
  }
}
