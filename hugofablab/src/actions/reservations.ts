"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { reservations, resources, users, waitlist } from "@/db/schema";
import { getCurrentUser, requireAdmin, requireUser } from "@/lib/auth";
import { addMinutes, fmtRange, fmtShortDate, fmtTime, labDate } from "@/lib/dates";
import { generateToken } from "@/lib/password";
import { checkSlot, getReservationView, notify, notifyAdmins, promoteWaitlist, reservationLabel, type SlotCheck } from "@/lib/reservations";

export type ReserveState = { error?: string; full?: boolean; success?: string; reservationId?: number } | null;
export type SimpleResult = { error?: string; success?: string };

function revalidateAll() {
  revalidatePath("/", "layout");
}

function parseSlot(fd: FormData | { date: string; start: string; duration: number }) {
  const date = fd instanceof FormData ? String(fd.get("date") ?? "") : fd.date;
  const start = fd instanceof FormData ? String(fd.get("start") ?? "") : fd.start;
  const duration = fd instanceof FormData ? Number(fd.get("duration") ?? 0) : fd.duration;
  const startAt = labDate(date, start);
  if (!startAt || !duration || duration <= 0) return null;
  return { startAt, endAt: addMinutes(startAt, duration) };
}

/** Ressource du lab de l'utilisateur uniquement. */
async function labResource(resourceId: number, labId: number) {
  const [r] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, resourceId), eq(resources.labId, labId)))
    .limit(1);
  return r ?? null;
}

export async function checkSlotAction(input: { resourceId: number; date: string; start: string; duration: number }): Promise<SlotCheck> {
  const user = await getCurrentUser();
  const base: SlotCheck = { ok: false, full: false, reason: "Non connecté.", taken: 0, capacity: 0, requiredLevel: "debutant", userLevel: "debutant" };
  if (!user || !user.labId) return base;
  const resource = await labResource(input.resourceId, user.labId);
  if (!resource) return { ...base, reason: "Ressource introuvable." };
  const slot = parseSlot(input);
  if (!slot) return { ...base, reason: "Créneau incomplet." };
  return checkSlot({ user, resource, ...slot, admin: user.role === "fabmanager" });
}

export async function createReservationAction(_: ReserveState, fd: FormData): Promise<ReserveState> {
  const user = await requireUser();
  const clientRequestId = String(fd.get("clientRequestId") ?? "");
  if (clientRequestId && !/^[0-9a-f-]{36}$/i.test(clientRequestId)) {
    return { error: "Identifiant de demande invalide." };
  }
  if (clientRequestId) {
    const [existing] = await db
      .select({ id: reservations.id, userId: reservations.userId })
      .from(reservations)
      .where(eq(reservations.clientRequestId, clientRequestId))
      .limit(1);
    if (existing) {
      return existing.userId === user.id
        ? { success: "Votre demande a déjà été envoyée au responsable du lab.", reservationId: existing.id }
        : { error: "Cette demande ne peut pas être traitée." };
    }
  }
  const purpose = String(fd.get("purpose") ?? "").trim() || null;
  const resource = await labResource(Number(fd.get("resourceId")), user.labId);
  if (!resource) return { error: "Ressource introuvable." };
  const slot = parseSlot(fd);
  if (!slot) return { error: "Veuillez choisir une date, une heure et une durée." };
  const check = await checkSlot({ user, resource, ...slot, admin: user.role === "fabmanager" });
  if (!check.ok) return { error: check.reason ?? "Créneau indisponible.", full: check.full };

  const [r] = await db
    .insert(reservations)
    .values({ userId: user.id, resourceId: resource.id, startAt: slot.startAt, endAt: slot.endAt, status: "en_attente", purpose, createdBy: user.id, qrToken: generateToken(), clientRequestId: clientRequestId || null })
    .onConflictDoNothing({ target: reservations.clientRequestId })
    .returning();
  if (!r && clientRequestId) {
    const [existing] = await db
      .select({ id: reservations.id, userId: reservations.userId })
      .from(reservations)
      .where(eq(reservations.clientRequestId, clientRequestId))
      .limit(1);
    return existing?.userId === user.id
      ? { success: "Votre demande a déjà été envoyée au responsable du lab.", reservationId: existing.id }
      : { error: "Cette demande ne peut pas être traitée." };
  }
  if (!r) return { error: "La demande n’a pas pu être enregistrée. Réessayez." };
  const label = reservationLabel(resource.name, slot.startAt);
  await notify(user.id, "en_attente", "⏳ Demande enregistrée", `${label} : en attente de validation par le responsable du lab.`, r.id);
  await notifyAdmins(user.labId, "en_attente", "⏳ Nouvelle demande de réservation", `${user.name} — ${label}${purpose ? ` (${purpose})` : ""}.`, r.id);
  revalidateAll();
  return { success: "Votre demande a été envoyée au responsable du lab.", reservationId: r.id };
}

export async function joinWaitlistAction(_: ReserveState, fd: FormData): Promise<ReserveState> {
  const user = await requireUser();
  const purpose = String(fd.get("purpose") ?? "").trim() || null;
  const slot = parseSlot(fd);
  const resource = await labResource(Number(fd.get("resourceId")), user.labId);
  if (!resource || !slot) return { error: "Créneau invalide." };
  const [existing] = await db
    .select({ id: waitlist.id })
    .from(waitlist)
    .where(and(eq(waitlist.userId, user.id), eq(waitlist.resourceId, resource.id), eq(waitlist.startAt, slot.startAt), eq(waitlist.status, "active")))
    .limit(1);
  if (existing) return { error: "Vous êtes déjà inscrit(e) en liste d'attente pour ce créneau." };
  await db.insert(waitlist).values({ userId: user.id, resourceId: resource.id, startAt: slot.startAt, endAt: slot.endAt, purpose });
  await notify(user.id, "liste_attente", "📋 Inscrit(e) en liste d'attente", `${reservationLabel(resource.name, slot.startAt)} : vous serez prévenu(e) automatiquement dès qu'une place se libère.`);
  revalidateAll();
  return { success: "Vous êtes en liste d'attente. Nous vous préviendrons dès qu'une place se libère." };
}

export async function leaveWaitlistAction(id: number): Promise<SimpleResult> {
  const user = await requireUser();
  await db.update(waitlist).set({ status: "annulee" }).where(and(eq(waitlist.id, id), eq(waitlist.userId, user.id)));
  revalidateAll();
  return { success: "Retiré(e) de la liste d'attente." };
}

export async function cancelMyReservationAction(id: number): Promise<SimpleResult> {
  const user = await requireUser();
  const view = await getReservationView(id);
  if (!view || view.user.id !== user.id) return { error: "Réservation introuvable." };
  if (view.status === "annulee") return { error: "Cette réservation est déjà annulée." };
  if (view.startAt.getTime() < Date.now()) return { error: "Impossible d'annuler une réservation passée." };
  await db.update(reservations).set({ status: "annulee", modifiedBy: user.id, updatedAt: new Date() }).where(eq(reservations.id, id));
  const label = reservationLabel(view.resource.name, view.startAt);
  await notify(user.id, "annulee", "❌ Réservation annulée", `${label} — annulée à votre demande.`, id);
  await notifyAdmins(user.labId, "annulee", "❌ Réservation annulée par l'élève", `${user.name} a annulé : ${label}.`, id);
  await promoteWaitlist(view.resource.id);
  revalidateAll();
  return { success: "Réservation annulée." };
}

// ---------- Responsable du lab (limité à SON lab) ----------
async function adminView(id: number, labId: number) {
  const view = await getReservationView(id);
  return view && view.resource.labId === labId ? view : null;
}

export async function adminSetStatusAction(id: number, status: "confirmee" | "annulee", note?: string): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const view = await adminView(id, admin.labId);
  if (!view) return { error: "Réservation introuvable." };
  if (view.status === status) return { error: `Déjà ${status === "confirmee" ? "confirmée" : "annulée"}.` };
  const cleanNote = note?.trim() || null;
  await db
    .update(reservations)
    .set({ status, modifiedBy: admin.id, updatedAt: new Date(), ...(cleanNote ? { adminNote: cleanNote } : {}) })
    .where(eq(reservations.id, id));
  const label = reservationLabel(view.resource.name, view.startAt);
  if (status === "confirmee") {
    await notify(
      view.user.id,
      "confirmee",
      "✅ Réservation confirmée",
      `${view.resource.name} — confirmée pour le ${fmtShortDate(view.startAt)} à ${fmtTime(view.startAt)}${view.room ? ` (${view.room.name})` : ""}.${cleanNote ? ` Note : ${cleanNote}` : ""}`,
      id,
    );
  } else {
    await notify(view.user.id, "annulee", "❌ Réservation annulée", `${label} — annulée par le responsable du lab.${cleanNote ? ` Motif : ${cleanNote}` : ""}`, id);
    await promoteWaitlist(view.resource.id);
  }
  revalidateAll();
  return { success: status === "confirmee" ? "Réservation confirmée." : "Réservation annulée." };
}

export async function adminUpdateReservationAction(_: ReserveState, fd: FormData): Promise<ReserveState> {
  const admin = await requireAdmin();
  const id = Number(fd.get("id"));
  const note = String(fd.get("note") ?? "").trim() || null;
  const view = await adminView(id, admin.labId);
  if (!view) return { error: "Réservation introuvable." };
  const resource = await labResource(Number(fd.get("resourceId")), admin.labId);
  if (!resource) return { error: "Ressource introuvable." };
  const slot = parseSlot(fd);
  if (!slot) return { error: "Créneau invalide." };
  const [targetUser] = await db.select().from(users).where(eq(users.id, view.user.id)).limit(1);
  if (!targetUser) return { error: "Utilisateur introuvable." };
  const check = await checkSlot({ user: targetUser, resource, ...slot, excludeId: id, admin: true });
  if (!check.ok) return { error: check.reason ?? "Créneau indisponible.", full: check.full };

  const changes: string[] = [];
  if (resource.id !== view.resource.id) changes.push(`ressource : ${view.resource.name} → ${resource.name}`);
  if (slot.startAt.getTime() !== view.startAt.getTime() || slot.endAt.getTime() !== view.endAt.getTime()) changes.push(`créneau : ${fmtRange(slot.startAt, slot.endAt)}`);
  await db
    .update(reservations)
    .set({
      resourceId: resource.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      adminNote: note,
      modifiedBy: admin.id,
      updatedAt: new Date(),
      status: view.status === "annulee" ? "confirmee" : view.status,
    })
    .where(eq(reservations.id, id));
  await notify(
    view.user.id,
    "modifiee",
    "✏️ Réservation modifiée",
    `Réservation ${resource.name} — modifiée par le responsable${changes.length ? ` (${changes.join(" ; ")})` : ""}. Nouveau créneau : ${fmtRange(slot.startAt, slot.endAt)}.${note ? ` Note : ${note}` : ""}`,
    id,
  );
  if (resource.id !== view.resource.id) await promoteWaitlist(view.resource.id);
  revalidateAll();
  return { success: "Réservation modifiée et élève notifié." };
}

export async function checkInAction(id: number): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const view = await adminView(id, admin.labId);
  if (!view) return { error: "Réservation introuvable." };
  if (view.checkedInAt) return { success: `Présence de ${view.user.name} déjà enregistrée.` };
  const [checkedIn] = await db
    .update(reservations)
    .set({ checkedInAt: new Date(), updatedAt: new Date() })
    .where(and(eq(reservations.id, id), isNull(reservations.checkedInAt)))
    .returning({ id: reservations.id });
  if (!checkedIn) return { success: `Présence de ${view.user.name} déjà enregistrée.` };
  await notify(view.user.id, "presence", "📍 Présence pointée", `Bienvenue au FabLab ! Présence enregistrée pour ${view.resource.name} (${fmtRange(view.startAt, view.endAt)}).`, id);
  revalidateAll();
  return { success: `Présence de ${view.user.name} enregistrée.` };
}
