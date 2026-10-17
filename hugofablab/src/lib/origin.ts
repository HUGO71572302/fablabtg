import { headers } from "next/headers";

const ENV_ORIGIN = () => {
  const configured = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (!configured) return "";
  try { return new URL(configured.includes("://") ? configured : `https://${configured}`).origin; } catch { return ""; }
};

function deploymentOrigin() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (!host) return "";
  try { return new URL(host.includes("://") ? host : `https://${host}`).origin; } catch { return ""; }
}

function fromHeaders(get: (k: string) => string | null): string | null {
  const host = (get("x-forwarded-host") ?? get("host") ?? "").split(",")[0].trim();
  if (!host) return null;
  const isLocal = host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("0.0.0.0");
  // Tout hôte public est servi en HTTPS (certains proxies annoncent « http » pour le saut interne).
  const proto = isLocal ? (get("x-forwarded-proto") ?? "").split(",")[0].trim() || "http" : "https";
  return `${proto}://${host}`;
}

/**
 * Origine publique de l'application (https://domaine), fiable derrière un proxy (Vercel, sandbox, nginx).
 * Priorité : hôte public réel de la requête (x-forwarded-host / host) → APP_URL → URL brute.
 */
export function publicOriginFromRequest(req: Request): string {
  const env = ENV_ORIGIN();
  if (env) return env;
  const deployment = deploymentOrigin();
  if (deployment) return deployment;
  const fromReq = fromHeaders((k) => req.headers.get(k));
  return fromReq ?? new URL(req.url).origin;
}

/** Même logique, utilisable dans les Server Components / Server Actions. */
export async function publicOrigin(): Promise<string> {
  const env = ENV_ORIGIN();
  if (env) return env;
  const deployment = deploymentOrigin();
  if (deployment) return deployment;
  const h = await headers();
  const fromReq = fromHeaders((k) => h.get(k));
  return fromReq ?? "http://localhost:3000";
}

export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

/**
 * URI de redirection Google. Google exige une correspondance EXACTE avec l'URI autorisée
 * enregistrée dans la console Google : on accepte donc une valeur figée (GOOGLE_REDIRECT_URI)
 * pour les domaines stables, sinon on déduit l'hôte réel de l'aperçu.
 */
export function googleRedirectUri(req: Request): string {
  const env = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (env) return env.replace(/\/+$/, "");
  return `${publicOriginFromRequest(req)}${GOOGLE_CALLBACK_PATH}`;
}

/** Valeurs à afficher dans l'interface pour les copier dans la console Google. */
export async function googleOAuthConfigServer(): Promise<{ redirectUri: string; jsOrigin: string }> {
  const origin = await publicOrigin();
  const env = process.env.GOOGLE_REDIRECT_URI?.trim();
  const redirectUri = env ? env.replace(/\/+$/, "") : `${origin}${GOOGLE_CALLBACK_PATH}`;
  let jsOrigin = origin;
  try {
    jsOrigin = new URL(redirectUri).origin;
  } catch {
    /* on garde l'origine déduite */
  }
  return { redirectUri, jsOrigin };
}
