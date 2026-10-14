"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { labSettings, labs, media, users } from "@/db/schema";
import { createSession, requireAdmin, requireBillingUser } from "@/lib/auth";
import { uniqueSlug, uniqueUsername } from "@/lib/labs";
import { saveImage } from "@/lib/media";
import { hashPassword } from "@/lib/password";
import { ensureSubscription } from "@/lib/billing";
import type { ActionState } from "./auth";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function field(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

/** Inscription d'un responsable : crée son FabLab (identité) et son compte responsable, rattaché à ce lab. */
export async function registerLabAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const requiredCode = process.env.LAB_CREATION_CODE;
  if (requiredCode && field(fd, "creationCode") !== requiredCode) return { error: "Code d'autorisation de création de lab invalide." };

  const managerName = field(fd, "managerName");
  const email = field(fd, "email").toLowerCase();
  const phone = field(fd, "phone");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const name = field(fd, "labName");
  const schoolName = field(fd, "schoolName");

  if (managerName.length < 2) return { error: "Indiquez votre nom complet." };
  if (!EMAIL_RE.test(email)) return { error: "Adresse e-mail valide requise." };
  if (phone.replace(/\D/g, "").length < 8) return { error: "Numéro de téléphone valide requis (8 chiffres minimum)." };
  if (password.length < 6) return { error: "Mot de passe : 6 caractères minimum (8 conseillés)." };
  if (password !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };
  if (name.length < 2) return { error: "Donnez un nom à votre FabLab." };
  if (schoolName.length < 2) return { error: "Indiquez le nom de votre établissement." };

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (existing && existing.role === "fabmanager") {
    return { error: "Un compte responsable existe déjà avec cet e-mail. Connectez-vous sur la page de connexion." };
  }

  const slug = await uniqueSlug(name);
  const [lab] = await db
    .insert(labs)
    .values({
      slug,
      name,
      schoolName,
      city: field(fd, "city") || null,
      region: field(fd, "region") || null,
      country: field(fd, "country") || "Togo",
      description: field(fd, "description") || null,
      motto: field(fd, "motto") || null,
      contactEmail: email,
      contactPhone: phone,
    })
    .returning();

  let logoId: number | null = null;
  let coverId: number | null = null;
  let managerPhotoId: number | null = null;
  try {
    logoId = await saveImage(fd.get("logo"), lab.id, 512);
    coverId = await saveImage(fd.get("cover"), lab.id, 1920);
    managerPhotoId = await saveImage(fd.get("managerPhoto"), lab.id, 800);
  } catch (e) {
    await db.delete(media).where(eq(media.labId, lab.id));
    await db.delete(labs).where(eq(labs.id, lab.id));
    return { error: e instanceof Error ? e.message : "Image non valide." };
  }

  if (logoId || coverId || managerPhotoId) {
    await db.update(labs).set({ logoId, coverId, managerPhotoId }).where(eq(labs.id, lab.id));
  }
  await db.insert(labSettings).values({ labId: lab.id }).onConflictDoNothing();
  // Essai gratuit de 10 minutes : le minuteur démarre au moment exact de la création du lab.
  await ensureSubscription(lab.id);

  const username = existing?.username ?? (await uniqueUsername(email.split("@")[0] || managerName));

  let managerId: number;
  if (existing) {
    await db
      .update(users)
      .set({
        name: managerName,
        username,
        phone,
        passwordHash: hashPassword(password),
        role: "fabmanager",
        autonomyLevel: "expert",
        organisation: "Responsable du FabLab",
        labId: lab.id,
        emailVerified: true,
        active: true,
        failedAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, existing.id));
    managerId = existing.id;
  } else {
    const [created] = await db
      .insert(users)
      .values({
        name: managerName,
        email,
        username,
        phone,
        passwordHash: hashPassword(password),
        role: "fabmanager",
        autonomyLevel: "expert",
        organisation: "Responsable du FabLab",
        labId: lab.id,
        emailVerified: true,
        active: true,
      })
      .returning({ id: users.id });
    managerId = created.id;
  }

  await createSession(managerId);
  revalidatePath("/", "layout");
  redirect("/admin/ressources?bienvenue=1");
}

/** Modification de l'identité du lab par son responsable. */
export async function saveLabIdentityAction(fd: FormData) {
  const admin = await requireAdmin();
  const name = field(fd, "labName");
  const schoolName = field(fd, "schoolName");
  if (name.length < 2 || schoolName.length < 2) redirect("/admin/identite?error=champs");
  const ids: { logoId?: number; coverId?: number; managerPhotoId?: number } = {};
  try {
    const logo = await saveImage(fd.get("logo"), admin.labId, 512);
    const cover = await saveImage(fd.get("cover"), admin.labId, 1920);
    const photo = await saveImage(fd.get("managerPhoto"), admin.labId, 800);
    if (logo) ids.logoId = logo;
    if (cover) ids.coverId = cover;
    if (photo) ids.managerPhotoId = photo;
  } catch {
    redirect("/admin/identite?error=image");
  }
  await db
    .update(labs)
    .set({
      name,
      schoolName,
      city: field(fd, "city") || null,
      region: field(fd, "region") || null,
      country: field(fd, "country") || "Togo",
      description: field(fd, "description") || null,
      motto: field(fd, "motto") || null,
      contactEmail: field(fd, "contactEmail") || null,
      contactPhone: field(fd, "contactPhone") || null,
      ...ids,
    })
    .where(eq(labs.id, admin.labId));
  revalidatePath("/", "layout");
  redirect("/admin/identite?saved=1");
}

export async function deactivateOwnLabAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const manager = await requireBillingUser();
  if (manager.role !== "fabmanager") return { error: "Seul le responsable du lab peut le mettre en pause." };
  const [lab] = await db.select({ name: labs.name, active: labs.active }).from(labs).where(eq(labs.id, manager.labId)).limit(1);
  if (!lab) return { error: "Lab introuvable." };
  if (!lab.active) redirect("/lab-desactive");
  if (field(fd, "labNameConfirmation") !== lab.name) return { error: "Le nom saisi ne correspond pas exactement au nom du lab." };
  if (field(fd, "confirmationPhrase") !== "METTRE EN PAUSE") return { error: "Saisissez exactement « METTRE EN PAUSE » pour confirmer." };
  if (fd.get("acknowledgeData") !== "on") return { error: "Confirmez que vous avez compris la mise en pause et la conservation des données." };
  const [updated] = await db.update(labs).set({ active: false }).where(and(eq(labs.id, manager.labId), eq(labs.active, true))).returning({ id: labs.id });
  if (!updated) return { error: "Le lab a déjà été mis en pause." };
  revalidatePath("/", "layout");
  redirect("/lab-desactive?pause=1");
}

export async function reactivateOwnLabAction() {
  const manager = await requireBillingUser();
  if (manager.role !== "fabmanager") redirect("/");
  await db.update(labs).set({ active: true }).where(eq(labs.id, manager.labId));
  revalidatePath("/", "layout");
  redirect("/admin/identite?reactivated=1");
}
