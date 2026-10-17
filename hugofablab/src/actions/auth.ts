"use server";

import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, count, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { labs, sessions, users } from "@/db/schema";
import { createSession, destroySession } from "@/lib/auth";
import { getSubscriptionAccess } from "@/lib/billing";
import { assignSheetNumber } from "@/lib/pedagogy";
import { CLASS_LEVELS } from "@/lib/labels";
import { hashPassword, passwordIssue, verifyPassword } from "@/lib/password";
import { ensureSeeded } from "@/db/seed";
import { notifyAdmins } from "@/lib/reservations";

export type ActionState = { error?: string; success?: string } | null;

/** Réinitialisation courte, à usage unique, après vérification de l'identité Google du responsable. */
export async function resetManagerPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const store = await cookies();
  const cookie = store.get("hf_password_reset")?.value ?? "";
  const parsed = /^(\d{13})\.([a-f0-9]{64})$/.exec(cookie);
  if (!parsed || Number(parsed[1]) <= Date.now()) return { error: "La vérification Google a expiré. Recommencez la procédure." };

  const password = String(fd.get("password") ?? "");
  const confirmPassword = String(fd.get("confirmPassword") ?? "");
  const issue = passwordIssue(password);
  if (issue) return { error: issue };
  if (password !== confirmPassword) return { error: "La confirmation du mot de passe ne correspond pas." };

  const tokenHash = createHash("sha256").update(parsed[2]).digest("hex");
  const challenge = `pwdreset:${parsed[1]}:${tokenHash}`;
  const [match] = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "fabmanager"), eq(users.verificationCode, challenge))).limit(1);
  if (!match) {
    store.delete("hf_password_reset");
    return { error: "Le lien de récupération a expiré ou a déjà été utilisé. Recommencez avec Google." };
  }

  const [updated] = await db.update(users).set({ passwordHash: hashPassword(password), verificationCode: null, failedAttempts: 0, lockedUntil: null }).where(and(eq(users.id, match.id), eq(users.verificationCode, challenge))).returning({ id: users.id });
  if (!updated) return { error: "La demande a déjà été utilisée. Recommencez la procédure." };
  await db.delete(sessions).where(eq(sessions.userId, match.id));
  store.delete("hf_password_reset");
  return { success: "Votre mot de passe a été changé. Vous pouvez maintenant vous connecter." };
}

const MAX_ATTEMPTS = 8;
const LOCK_MINUTES = 15;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

/**
 * Connexion universelle : identifiant, e-mail, téléphone ou nom complet + code PIN ou mot de passe.
 * Fonctionne pour les élèves (PIN) et les responsables de lab (mot de passe).
 */
export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await ensureSeeded();
  const rawIdentifier = String(fd.get("identifier") ?? "").trim();
  const identifier = rawIdentifier.toLowerCase();
  const secret = String(fd.get("secret") ?? "");
  if (rawIdentifier.length > 200 || secret.length > 1024) return { error: "Identifiant ou code trop long." };
  if (!identifier || !secret) return { error: "Saisissez votre identifiant (ou e-mail / téléphone) et votre code." };

  const phoneDigits = rawIdentifier.replace(/\D/g, "");

  // Rechercher l'utilisateur par identifiant, e-mail, nom ou téléphone
  const conds = [
    eq(sql`lower(${users.username})`, identifier),
    eq(sql`lower(${users.email})`, identifier),
    eq(sql`lower(${users.name})`, identifier),
  ];

  if (phoneDigits.length >= 8) {
    conds.push(sql`regexp_replace(coalesce(${users.phone}, ''), '[^0-9]', '', 'g') = ${phoneDigits}`);
    if (phoneDigits.length > 8) {
      conds.push(sql`regexp_replace(coalesce(${users.phone}, ''), '[^0-9]', '', 'g') LIKE '%' || ${phoneDigits.slice(-8)}`);
    }
  }

  const candidates = await db
    .select()
    .from(users)
    .where(or(...conds))
    .limit(5);

  if (!candidates.length) {
    return { error: "Identifiant, e-mail ou téléphone non reconnu. Vérifiez votre saisie ou inscrivez-vous." };
  }

  // Trouver le compte dont le mot de passe / PIN correspond
  let matchedUser = candidates.find(
    (c) => verifyPassword(secret, c.passwordHash) || verifyPassword(secret.trim(), c.passwordHash),
  );

  // Si aucun mot de passe ne correspond, prendre le premier candidat pour gérer les tentatives échouées
  const targetUser = matchedUser ?? candidates[0];

  if (targetUser.lockedUntil && targetUser.lockedUntil > new Date()) {
    const min = Math.ceil((targetUser.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: `Compte temporairement bloqué suite à trop d'essais. Réessayez dans ${min} min, ou contactez le responsable du lab.` };
  }

  if (!matchedUser) {
    const attempts = targetUser.failedAttempts + 1;
    const lock = attempts >= MAX_ATTEMPTS;
    await db
      .update(users)
      .set({ failedAttempts: lock ? 0 : attempts, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null })
      .where(eq(users.id, targetUser.id));
    return {
      error: lock
        ? `Trop d'essais infructueux : compte bloqué pendant ${LOCK_MINUTES} min.`
        : `Code PIN ou mot de passe incorrect (${MAX_ATTEMPTS - attempts} essai(s) restant(s)).`,
    };
  }

  if (!matchedUser.active) {
    return { error: "Ce compte a été désactivé. Contactez le responsable de votre FabLab." };
  }

  // Connexion réussie : réinitialiser les compteurs d'échec
  await db.update(users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(users.id, matchedUser.id));
  await createSession(matchedUser.id);
  redirect(matchedUser.role === "fabmanager" ? "/admin" : "/app");
}

/** Inscription d'un élève ou d'un utilisateur externe avec identifiant, code PIN et téléphone. */
export async function registerMemberAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await ensureSeeded();
  const labId = Number(fd.get("labId"));
  const name = String(fd.get("name") ?? "").trim();
  const role = fd.get("accountType") === "external" ? "external" : "student";
  const classLevel = role === "student" ? String(fd.get("classLevel") ?? "") : "";
  const organisation = role === "student"
    ? String(fd.get("section") ?? "").trim() || null
    : String(fd.get("organisation") ?? "").trim().slice(0, 80) || null;
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const pin = String(fd.get("pin") ?? "").trim();
  const pinConfirm = String(fd.get("pinConfirm") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();

  const [lab] = await db.select({ id: labs.id }).from(labs).where(and(eq(labs.id, labId), eq(labs.active, true))).limit(1);
  if (!lab) return { error: "Choisissez le FabLab de votre établissement." };
  const access = await getSubscriptionAccess(labId);
  if (!access.access) return { error: "Les inscriptions sont suspendues. Le responsable du FabLab doit renouveler son abonnement." };
  if (access.phase !== "trial" && access.plan === "essentiel") {
    const [{ total }] = await db.select({ total: count() }).from(users).where(and(eq(users.labId, labId), eq(users.role, "student")));
    if (total >= 150) return { error: "La formule Essentiel est limitée à 150 apprenants. Le responsable peut passer à la formule Plus pour continuer les inscriptions." };
  }
  if (name.length < 2) return { error: "Indiquez votre nom et prénom complets." };
  if (role === "student" && !CLASS_LEVELS.some((c) => c.value === classLevel)) return { error: "Choisissez votre classe (de la 6e à la Terminale)." };
  if (!USERNAME_RE.test(username)) return { error: "Identifiant : 3 à 30 caractères (lettres minuscules, chiffres, point, tiret), sans espace." };
  if (!/^\d{4,6}$/.test(pin)) return { error: "Le code PIN doit comporter 4 à 6 chiffres." };
  if (/^(\d)\1+$/.test(pin) || ["1234", "12345", "123456", "0123", "4321"].includes(pin)) return { error: "Code PIN trop simple : évitez 1234, 0000, etc." };
  if (pin !== pinConfirm) return { error: "Les deux codes PIN saisis ne correspondent pas." };
  if (phone.replace(/\D/g, "").length < 8) return { error: "Numéro de téléphone invalide (8 chiffres minimum)." };

  const [taken] = await db.select({ id: users.id }).from(users).where(eq(sql`lower(${users.username})`, username)).limit(1);
  if (taken) return { error: "Cet identifiant est déjà pris : choisissez-en un autre (ex. ajoutez un chiffre ou votre année)." };

  const [u] = await db
    .insert(users)
    .values({
      name,
      username,
      passwordHash: hashPassword(pin),
      role,
      labId,
      classLevel: role === "student" ? classLevel : null,
      organisation,
      phone,
      emailVerified: true,
      active: role === "student",
    })
    .returning({ id: users.id });

  if (role === "student") {
    // N° de fiche de classe (6E-001, TLE-D2-003) attribué dès l'inscription.
    await assignSheetNumber({ id: u.id, labId, classLevel, organisation, sheetNumber: null });
  } else {
    await notifyAdmins(labId, "info", "Demande d’accès externe", `${name}${organisation ? ` · ${organisation}` : ""} demande à rejoindre le FabLab. Activez son compte depuis « Membres du lab » après vérification.`);
    return { success: "Votre demande a été envoyée au responsable du FabLab. Vous pourrez vous connecter après l’activation du compte." };
  }

  await createSession(u.id);
  redirect("/app?bienvenue=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
