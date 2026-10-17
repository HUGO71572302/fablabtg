"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomInt } from "crypto";
import { and, eq, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { closures, labSettings, media, notifications, reservations, resources, sessions, userSkills, users, type Level, type ResourceStatus } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { fmtRange, labDate } from "@/lib/dates";
import { LEVEL_LABEL, LEVELS, RESOURCE_STATUS_LABEL } from "@/lib/labels";
import { saveImage } from "@/lib/media";
import { hashPassword, verifyPassword } from "@/lib/password";
import { notify } from "@/lib/reservations";
import type { ActionState } from "./auth";
import type { SimpleResult } from "./reservations";

function revalidateAll() {
  revalidatePath("/", "layout");
}

const asLevel = (v: unknown): Level => (LEVELS.includes(v as Level) ? (v as Level) : "debutant");

async function labResourceOf(id: number, labId: number) {
  const [r] = await db.select().from(resources).where(and(eq(resources.id, id), eq(resources.labId, labId))).limit(1);
  return r ?? null;
}
async function labUserOf(id: number, labId: number) {
  const [u] = await db.select().from(users).where(and(eq(users.id, id), eq(users.labId, labId))).limit(1);
  return u ?? null;
}

// ---------- Machines & salles ----------
export async function saveResourceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(fd.get("id") || 0);
  const type = fd.get("type") === "salle" ? "salle" : "machine";
  const name = String(fd.get("name") ?? "").trim();
  const category = String(fd.get("category") ?? "").trim() || (type === "salle" ? "Salle" : "Général");
  const description = String(fd.get("description") ?? "").trim() || null;
  const requiredLevel = asLevel(fd.get("requiredLevel"));
  const capacity = Math.max(1, Number(fd.get("capacity") || 1));
  const maxDurationMinutes = Math.max(15, Number(fd.get("maxDurationMinutes") || 120));
  const roomIdRaw = Number(fd.get("roomId") || 0);
  const icon = String(fd.get("icon") ?? "wrench");
  if (name.length < 2) return { error: "Nom requis." };
  if (id && !(await labResourceOf(id, admin.labId))) return { error: "Ressource introuvable." };
  let roomId: number | null = null;
  if (type === "machine" && roomIdRaw > 0) {
    const room = await labResourceOf(roomIdRaw, admin.labId);
    if (!room || room.type !== "salle") return { error: "Salle invalide." };
    roomId = room.id;
  }
  let photoId: number | null = null;
  try {
    photoId = await saveImage(fd.get("photo"), admin.labId, 1200);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Photo invalide." };
  }
  const values = { type, name, category, description, requiredLevel, capacity, maxDurationMinutes, roomId, icon, ...(photoId ? { photoId } : {}) } as const;
  if (id) await db.update(resources).set(values).where(and(eq(resources.id, id), eq(resources.labId, admin.labId)));
  else await db.insert(resources).values({ ...values, labId: admin.labId, sortOrder: type === "salle" ? 5 : 50 });
  revalidateAll();
  return { success: id ? "Ressource mise à jour." : "Ressource ajoutée à votre lab." };
}

export async function setResourceStatusAction(id: number, status: ResourceStatus): Promise<SimpleResult> {
  const admin = await requireAdmin();
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Ressource invalide." };
  if (!(status === "disponible" || status === "maintenance" || status === "desactivee")) return { error: "Statut de ressource invalide." };
  const res = await labResourceOf(id, admin.labId);
  if (!res) return { error: "Ressource introuvable." };
  await db.update(resources).set({ status }).where(eq(resources.id, id));
  if (status !== "disponible") {
    const affected = await db
      .select({ id: reservations.id, userId: reservations.userId, startAt: reservations.startAt, endAt: reservations.endAt })
      .from(reservations)
      .where(and(eq(reservations.resourceId, id), ne(reservations.status, "annulee"), gt(reservations.endAt, new Date())));
    for (const r of affected) {
      await notify(
        r.userId,
        "info",
        `ℹ️ ${res.name} : ${RESOURCE_STATUS_LABEL[status].toLowerCase()}`,
        `Votre réservation du ${fmtRange(r.startAt, r.endAt)} pourrait être modifiée. Le responsable vous tiendra informé(e).`,
        r.id,
      );
    }
  }
  revalidateAll();
  return { success: `${res.name} → ${RESOURCE_STATUS_LABEL[status]}.` };
}

export async function deleteResourceAction(id: number, confirmationCode: string): Promise<SimpleResult> {
  const admin = await requireAdmin();
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Ressource invalide." };
  const resource = await labResourceOf(id, admin.labId);
  if (!resource) return { error: "Ressource introuvable dans votre lab." };
  if (!admin.passwordHash) return { error: "Votre compte responsable n’a pas de mot de passe défini. Définissez-en un avant de supprimer une ressource." };
  if (!verifyPassword(String(confirmationCode ?? ""), admin.passwordHash)) {
    return { error: "Code incorrect. Saisissez le mot de passe actuel du responsable." };
  }
  await db.delete(resources).where(and(eq(resources.id, id), eq(resources.labId, admin.labId)));
  if (resource.photoId) await db.delete(media).where(and(eq(media.id, resource.photoId), eq(media.labId, admin.labId)));
  revalidateAll();
  return resource.type === "machine"
    ? { success: `Machine « ${resource.name} » supprimée avec ses réservations, listes d’attente, compétences machine et fermetures associées.` }
    : { success: `Salle « ${resource.name} » supprimée. Les machines qui y étaient rattachées sont conservées sans salle associée; les réservations et fermetures liées à cette salle ont été supprimées.` };
}

// ---------- Paramètres & fermetures ----------
export async function saveSettingsAction(fd: FormData) {
  const admin = await requireAdmin();
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => fd.get(`day_${d}`) === "on");
  const slotStepMinutes = [15, 30, 60].includes(Number(fd.get("slotStepMinutes"))) ? Number(fd.get("slotStepMinutes")) : 30;
  const values = {
    openDays: (days.length ? days : [1, 2, 3, 4, 5]).join(","),
    openTime: String(fd.get("openTime") ?? "08:00"),
    closeTime: String(fd.get("closeTime") ?? "18:00"),
    slotStepMinutes,
    maxDurationMinutes: Math.max(30, Number(fd.get("maxDurationMinutes") || 120)),
    maxActiveReservations: Math.max(1, Number(fd.get("maxActiveReservations") || 3)),
    announcement: String(fd.get("announcement") ?? "").trim() || null,
    updatedAt: new Date(),
  };
  const [s] = await db.select({ id: labSettings.id }).from(labSettings).where(eq(labSettings.labId, admin.labId)).limit(1);
  if (s) await db.update(labSettings).set(values).where(eq(labSettings.id, s.id));
  else await db.insert(labSettings).values({ ...values, labId: admin.labId });
  revalidateAll();
  redirect("/admin/disponibilites?saved=1");
}

export async function addClosureAction(fd: FormData) {
  const admin = await requireAdmin();
  let resourceId = Number(fd.get("resourceId") || 0) || null;
  if (resourceId && !(await labResourceOf(resourceId, admin.labId))) resourceId = null;
  const date = String(fd.get("date") ?? "");
  const endDate = String(fd.get("endDate") ?? "") || date;
  const startAt = labDate(date, String(fd.get("startTime") ?? "") || "00:00");
  const endAt = labDate(endDate, String(fd.get("endTime") ?? "") || "23:59");
  const reason = String(fd.get("reason") ?? "").trim() || "Fermeture";
  if (!startAt || !endAt || endAt <= startAt) redirect("/admin/disponibilites?error=dates");
  await db.insert(closures).values({ labId: admin.labId, resourceId, startAt, endAt, reason });
  revalidateAll();
  redirect("/admin/disponibilites?saved=1");
}

export async function deleteClosureAction(id: number) {
  const admin = await requireAdmin();
  await db.delete(closures).where(and(eq(closures.id, id), eq(closures.labId, admin.labId)));
  revalidateAll();
}

// ---------- Élèves ----------
export async function toggleUserActiveAction(id: number): Promise<SimpleResult> {
  const admin = await requireAdmin();
  if (id === admin.id) return { error: "Vous ne pouvez pas désactiver votre propre compte." };
  const u = await labUserOf(id, admin.labId);
  if (!u) return { error: "Utilisateur introuvable." };
  if (u.role === "fabmanager") return { error: "Le compte responsable est verrouillé." };
  await db.update(users).set({ active: !u.active }).where(eq(users.id, id));
  revalidateAll();
  return { success: u.active ? `${u.name} désactivé(e).` : `${u.name} réactivé(e).` };
}

/** Suppression définitive d'un élève ou membre externe après confirmation du responsable. */
export async function deleteLabMemberAction(id: number, confirmationCode: string): Promise<SimpleResult> {
  const admin = await requireAdmin();
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Membre invalide." };
  const member = await labUserOf(id, admin.labId);
  if (!member || (member.role !== "student" && member.role !== "external")) return { error: "Membre introuvable dans votre lab." };
  if (!admin.passwordHash) return { error: "Votre compte responsable n’a pas de mot de passe défini. Définissez-en un avant de supprimer un membre." };
  if (!verifyPassword(String(confirmationCode ?? ""), admin.passwordHash)) {
    return { error: "Code incorrect. Saisissez le mot de passe actuel du responsable." };
  }

  await db.delete(users).where(and(eq(users.id, id), eq(users.labId, admin.labId), eq(users.role, member.role)));
  revalidatePath("/admin/utilisateurs");
  revalidateAll();
  return { success: `Le compte de ${member.name} a été supprimé. Ses réservations, notifications et niveaux machine associés ont également été supprimés.` };
}

/** Code PIN oublié : le responsable génère un nouveau code et le remet à l'élève. */
export async function resetPinAction(id: number): Promise<SimpleResult & { pin?: string; username?: string | null }> {
  const admin = await requireAdmin();
  const u = await labUserOf(id, admin.labId);
  if (!u) return { error: "Utilisateur introuvable." };
  if (u.role === "fabmanager") return { error: "Impossible pour un compte responsable." };
  const pin = String(randomInt(1000, 10000));
  await db.update(users).set({ passwordHash: hashPassword(pin), failedAttempts: 0, lockedUntil: null }).where(eq(users.id, id));
  await db.delete(sessions).where(eq(sessions.userId, id));
  return { success: `Nouveau code PIN généré pour ${u.name}.`, pin, username: u.username };
}

export async function setUserLevelAction(id: number, level: Level): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const u = await labUserOf(id, admin.labId);
  if (!u) return { error: "Utilisateur introuvable." };
  const lv = asLevel(level);
  await db.update(users).set({ autonomyLevel: lv }).where(eq(users.id, id));
  if (u.id !== admin.id) await notify(u.id, "niveau", "🏅 Niveau d'autonomie mis à jour", `Votre niveau général est maintenant « ${LEVEL_LABEL[lv]} », attribué par le responsable du lab.`);
  revalidateAll();
  return { success: `Niveau de ${u.name} : ${LEVEL_LABEL[lv]}.` };
}

export async function setUserSkillAction(userId: number, resourceId: number, level: Level): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const u = await labUserOf(userId, admin.labId);
  const r = await labResourceOf(resourceId, admin.labId);
  if (!u || !r) return { error: "Introuvable." };
  const lv = asLevel(level);
  await db
    .insert(userSkills)
    .values({ userId, resourceId, level: lv, grantedBy: admin.id, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [userSkills.userId, userSkills.resourceId], set: { level: lv, grantedBy: admin.id, updatedAt: new Date() } });
  await notify(u.id, "niveau", "🏅 Nouveau niveau débloqué", `Niveau « ${LEVEL_LABEL[lv]} » accordé pour ${r.name} par le responsable du lab.`);
  revalidateAll();
  return { success: `${u.name} · ${r.name} → ${LEVEL_LABEL[lv]}.` };
}

// ---------- Notifications ----------
export async function markAllReadAction() {
  const user = await requireUser();
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, user.id));
  revalidateAll();
}
