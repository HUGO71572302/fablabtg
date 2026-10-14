import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { generateToken } from "@/lib/password";
import { getSubscriptionAccess, isPlatformAdmin } from "@/lib/billing";
import { isLabActive } from "@/lib/labs";

export const SESSION_COOKIE = "hf_session";
const SESSION_DAYS = 30;

export async function createSession(userId: number) {
  const id = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(sessions).values({ id, userId, expiresAt });
  const store = await cookies();
  const secure = await isSecureRequest();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    // En HTTPS (aperçu intégré, déploiement public) : SameSite=None + Secure ; en HTTP local : Lax.
    sameSite: secure ? "none" : "lax",
    secure,
    path: "/",
    expires: expiresAt,
  });
}

async function isSecureRequest() {
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
    const isLocal = !host || host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("0.0.0.0");
    if (!isLocal) return true; // tout hôte public est servi en HTTPS
    return (h.get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https";
  } catch {
    return false;
  }
}

export async function destroySession() {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || !row.user.active) return null;
  return row.user;
});

/** Utilisateur connecté et rattaché à un lab (tous les comptes le sont). */
export type LabUser = User & { labId: number };

/**
 * Session authentifiée sans contrôle d'abonnement : réservée aux pages/actions de facturation,
 * afin qu'un responsable puisse toujours déposer sa preuve de paiement après l'expiration.
 */
export async function requireBillingUser(): Promise<LabUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.labId) redirect("/");
  return user as LabUser;
}

/** Accès normal au lab : l'essai ou un abonnement actif est obligatoire. */
export async function requireUser(): Promise<LabUser> {
  const user = await requireBillingUser();
  if (!(await isLabActive(user.labId))) redirect("/lab-desactive");
  const access = await getSubscriptionAccess(user.labId);
  if (!access.access) redirect(`/abonnement?reason=${access.phase}`);
  return user;
}

/** Responsable du lab : ses droits sont strictement limités à SON lab (vérifié côté serveur dans chaque action). */
export async function requireAdmin(): Promise<LabUser> {
  const user = await requireUser();
  if (user.role !== "fabmanager") redirect("/app");
  return user;
}

/** Administrateur de plateforme (validation des preuves Mobile Money), accessible même si son propre essai est expiré. */
export async function requirePlatformAdmin(): Promise<LabUser> {
  const user = await requireBillingUser();
  if (!(await isPlatformAdmin(user))) redirect("/abonnement");
  return user;
}

export function isAdmin(user: Pick<User, "role"> | null | undefined) {
  return user?.role === "fabmanager";
}
