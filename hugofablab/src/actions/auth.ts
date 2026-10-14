"use server";

import { redirect } from "next/navigation";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { labs, users } from "@/db/schema";
import { createSession, destroySession } from "@/lib/auth";
import { assignSheetNumber } from "@/lib/pedagogy";
import { CLASS_LEVELS } from "@/lib/labels";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ensureSeeded } from "@/db/seed";

export type ActionState = { error?: string; success?: string } | null;

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

/** Inscription élève : identifiant + code PIN + numéro de téléphone (aucun e-mail obligatoire). */
export async function registerStudentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await ensureSeeded();
  const labId = Number(fd.get("labId"));
  const name = String(fd.get("name") ?? "").trim();
  const classLevel = String(fd.get("classLevel") ?? "");
  const section = String(fd.get("section") ?? "").trim() || null;
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const pin = String(fd.get("pin") ?? "").trim();
  const pinConfirm = String(fd.get("pinConfirm") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();

  const [lab] = await db.select({ id: labs.id }).from(labs).where(and(eq(labs.id, labId), eq(labs.active, true))).limit(1);
  if (!lab) return { error: "Choisissez le FabLab de votre établissement." };
  if (name.length < 2) return { error: "Indiquez votre nom et prénom complets." };
  if (!CLASS_LEVELS.some((c) => c.value === classLevel)) return { error: "Choisissez votre classe (de la 6e à la Terminale)." };
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
      role: "student",
      labId,
      classLevel,
      organisation: section,
      phone,
      emailVerified: true,
      active: true,
    })
    .returning({ id: users.id });

  // N° de fiche de classe (6E-001, TLE-D2-003) attribué dès l'inscription.
  await assignSheetNumber({ id: u.id, labId, classLevel, organisation: section, sheetNumber: null });

  await createSession(u.id);
  redirect("/app?bienvenue=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
