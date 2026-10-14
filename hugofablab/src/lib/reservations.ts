import { and, asc, count, desc, eq, gt, gte, isNull, lt, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  closures,
  labSettings,
  notifications,
  reservations,
  resources,
  userSkills,
  users,
  waitlist,
  type LabSettings,
  type Level,
  type NotificationType,
  type ReservationStatus,
  type Resource,
  type User,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { dayKey, fmtShortDate, fmtTime, minutesOfDay, timeToMinutes } from "@/lib/dates";
import { LEVEL_LABEL, LEVEL_RANK, maxLevel } from "@/lib/labels";
import { generateToken } from "@/lib/password";

/** Paramètres (horaires, règles) d'un lab ; créés avec les valeurs par défaut s'ils n'existent pas encore. */
export async function getSettings(labId: number): Promise<LabSettings> {
  await ensureSeeded();
  const [s] = await db.select().from(labSettings).where(eq(labSettings.labId, labId)).limit(1);
  if (s) return s;
  const [created] = await db.insert(labSettings).values({ labId }).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await db.select().from(labSettings).where(eq(labSettings.labId, labId)).limit(1);
  return again;
}

export async function getUserLevelFor(userId: number, resourceId: number, base: Level): Promise<Level> {
  const [s] = await db
    .select({ level: userSkills.level })
    .from(userSkills)
    .where(and(eq(userSkills.userId, userId), eq(userSkills.resourceId, resourceId)))
    .limit(1);
  return s ? maxLevel(base, s.level) : base;
}

export type SlotCheck = {
  ok: boolean;
  full: boolean;
  reason: string | null;
  taken: number;
  capacity: number;
  requiredLevel: Level;
  userLevel: Level;
};

export async function checkSlot(p: {
  user: User;
  resource: Resource;
  startAt: Date;
  endAt: Date;
  excludeId?: number;
  admin?: boolean;
  settings?: LabSettings;
}): Promise<SlotCheck> {
  const { user, resource, startAt, endAt, admin } = p;
  const labId = resource.labId ?? user.labId ?? 0;
  const settings = p.settings ?? (await getSettings(labId));
  const userLevel = await getUserLevelFor(user.id, resource.id, user.autonomyLevel);
  const base = { full: false, taken: 0, capacity: resource.capacity, requiredLevel: resource.requiredLevel, userLevel };
  const fail = (reason: string): SlotCheck => ({ ...base, ok: false, reason });

  if (resource.labId !== user.labId) return fail("Cette ressource n'appartient pas à votre FabLab.");
  if (!(endAt > startAt)) return fail("L'heure de fin doit être postérieure à l'heure de début.");
  const durationMin = Math.round((endAt.getTime() - startAt.getTime()) / 60000);
  if (resource.status === "desactivee") return fail("Cette ressource est désactivée.");
  if (resource.status === "maintenance" && !admin) return fail("Ressource en maintenance : réservation impossible pour le moment.");

  if (!admin) {
    if (startAt.getTime() < Date.now()) return fail("Ce créneau est déjà passé.");
    const maxDur = Math.min(resource.maxDurationMinutes, settings.maxDurationMinutes);
    if (durationMin > maxDur) return fail(`Durée maximale autorisée : ${maxDur} min pour cette ressource.`);
    const openDays = settings.openDays.split(",").map(Number);
    if (!openDays.includes(startAt.getUTCDay())) return fail("Le FabLab est fermé ce jour-là.");
    if (dayKey(startAt) !== dayKey(new Date(endAt.getTime() - 1))) return fail("Le créneau doit tenir sur une seule journée.");
    const endMin = minutesOfDay(endAt) === 0 ? 1440 : minutesOfDay(endAt);
    if (minutesOfDay(startAt) < timeToMinutes(settings.openTime) || endMin > timeToMinutes(settings.closeTime)) {
      return fail(`Horaires d'ouverture : ${settings.openTime} – ${settings.closeTime}.`);
    }
    if (LEVEL_RANK[userLevel] < LEVEL_RANK[resource.requiredLevel]) {
      return fail(
        `Niveau « ${LEVEL_LABEL[resource.requiredLevel]} » requis pour cette machine (votre niveau : ${LEVEL_LABEL[userLevel]}). Demandez une validation au responsable du lab.`,
      );
    }
    const scope: SQL[] = [and(isNull(closures.resourceId), eq(closures.labId, labId))!, eq(closures.resourceId, resource.id)];
    if (resource.roomId) scope.push(eq(closures.resourceId, resource.roomId));
    const [cl] = await db
      .select()
      .from(closures)
      .where(and(lt(closures.startAt, endAt), gt(closures.endAt, startAt), or(...scope)))
      .limit(1);
    if (cl) return fail(`Indisponible : ${cl.reason}.`);

    const [{ n: active }] = await db
      .select({ n: count() })
      .from(reservations)
      .where(
        and(
          eq(reservations.userId, user.id),
          ne(reservations.status, "annulee"),
          gt(reservations.endAt, new Date()),
          p.excludeId ? ne(reservations.id, p.excludeId) : undefined,
        ),
      );
    if (active >= settings.maxActiveReservations) {
      return fail(`Vous avez déjà ${active} réservation(s) active(s) (maximum ${settings.maxActiveReservations}).`);
    }
  }

  const [{ n: taken }] = await db
    .select({ n: count() })
    .from(reservations)
    .where(
      and(
        eq(reservations.resourceId, resource.id),
        ne(reservations.status, "annulee"),
        lt(reservations.startAt, endAt),
        gt(reservations.endAt, startAt),
        p.excludeId ? ne(reservations.id, p.excludeId) : undefined,
      ),
    );
  if (taken >= resource.capacity) {
    return { ...base, taken, ok: false, full: true, reason: `Complet : ${taken}/${resource.capacity} place(s) déjà réservée(s) sur ce créneau.` };
  }
  return { ...base, taken, ok: true, reason: null };
}

// ---------- Notifications ----------
export async function notify(userId: number, type: NotificationType, title: string, message: string, reservationId?: number | null) {
  await db.insert(notifications).values({ userId, type, title, message, reservationId: reservationId ?? null });
}

/** Notifie le(s) responsable(s) d'un lab donné uniquement. */
export async function notifyAdmins(labId: number, type: NotificationType, title: string, message: string, reservationId?: number | null) {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "fabmanager"), eq(users.labId, labId)));
  for (const a of admins) await notify(a.id, type, title, message, reservationId);
}

export function reservationLabel(resourceName: string, startAt: Date) {
  return `Réservation ${resourceName} — ${fmtShortDate(startAt)} à ${fmtTime(startAt)}`;
}

// ---------- Liste d'attente ----------
export async function promoteWaitlist(resourceId: number) {
  const [resource] = await db.select().from(resources).where(eq(resources.id, resourceId));
  if (!resource || !resource.labId) return;
  const entries = await db
    .select()
    .from(waitlist)
    .where(and(eq(waitlist.resourceId, resourceId), eq(waitlist.status, "active"), gt(waitlist.startAt, new Date())))
    .orderBy(asc(waitlist.createdAt));
  for (const w of entries) {
    const [u] = await db.select().from(users).where(eq(users.id, w.userId));
    if (!u || !u.active) continue;
    const check = await checkSlot({ user: u, resource, startAt: w.startAt, endAt: w.endAt });
    if (!check.ok) continue;
    const [r] = await db
      .insert(reservations)
      .values({
        userId: u.id,
        resourceId,
        startAt: w.startAt,
        endAt: w.endAt,
        status: "en_attente",
        purpose: w.purpose,
        createdBy: u.id,
        qrToken: generateToken(),
      })
      .returning();
    await db.update(waitlist).set({ status: "promue" }).where(eq(waitlist.id, w.id));
    await notify(
      u.id,
      "liste_attente",
      "🎉 Une place s'est libérée !",
      `${reservationLabel(resource.name, w.startAt)} : votre demande a été créée automatiquement depuis la liste d'attente et attend la validation du responsable.`,
      r.id,
    );
    await notifyAdmins(resource.labId, "en_attente", "⏳ Nouvelle demande (liste d'attente)", `${u.name} — ${reservationLabel(resource.name, w.startAt)} (promotion automatique).`, r.id);
  }
}

// ---------- Lecture ----------
const rooms = alias(resources, "rooms");

export type ReservationView = {
  id: number;
  status: ReservationStatus;
  startAt: Date;
  endAt: Date;
  purpose: string | null;
  adminNote: string | null;
  checkedInAt: Date | null;
  qrToken: string;
  createdAt: Date;
  resource: { id: number; labId: number | null; name: string; type: "salle" | "machine"; category: string; icon: string };
  room: { id: number; name: string } | null;
  user: {
    id: number;
    name: string;
    email: string | null;
    username: string | null;
    role: User["role"];
    organisation: string | null;
    classLevel: string | null;
  };
};

const viewColumns = {
  id: reservations.id,
  status: reservations.status,
  startAt: reservations.startAt,
  endAt: reservations.endAt,
  purpose: reservations.purpose,
  adminNote: reservations.adminNote,
  checkedInAt: reservations.checkedInAt,
  qrToken: reservations.qrToken,
  createdAt: reservations.createdAt,
  resource: { id: resources.id, labId: resources.labId, name: resources.name, type: resources.type, category: resources.category, icon: resources.icon },
  room: { id: rooms.id, name: rooms.name },
  user: {
    id: users.id,
    name: users.name,
    email: users.email,
    username: users.username,
    role: users.role,
    organisation: users.organisation,
    classLevel: users.classLevel,
  },
};

type RawView = Omit<ReservationView, "room"> & { room: { id: number | null; name: string | null } | null };
const normalize = (r: RawView): ReservationView => ({ ...r, room: r.room && r.room.id ? { id: r.room.id, name: r.room.name ?? "" } : null });

export async function listReservations(opts: {
  labId: number;
  userId?: number;
  from?: Date;
  to?: Date;
  status?: ReservationStatus | ReservationStatus[];
  notStatus?: ReservationStatus;
  resourceId?: number;
  limit?: number;
  order?: "asc" | "desc";
  endAfter?: Date;
  endBefore?: Date;
}): Promise<ReservationView[]> {
  const conds: (SQL | undefined)[] = [eq(resources.labId, opts.labId)];
  if (opts.userId) conds.push(eq(reservations.userId, opts.userId));
  if (opts.from) conds.push(gte(reservations.startAt, opts.from));
  if (opts.to) conds.push(lt(reservations.startAt, opts.to));
  if (opts.endAfter) conds.push(gt(reservations.endAt, opts.endAfter));
  if (opts.endBefore) conds.push(lte(reservations.endAt, opts.endBefore));
  if (opts.resourceId) conds.push(eq(reservations.resourceId, opts.resourceId));
  if (opts.notStatus) conds.push(ne(reservations.status, opts.notStatus));
  if (opts.status) {
    const arr = Array.isArray(opts.status) ? opts.status : [opts.status];
    conds.push(or(...arr.map((s) => eq(reservations.status, s))));
  }
  const rows = await db
    .select(viewColumns)
    .from(reservations)
    .innerJoin(resources, eq(reservations.resourceId, resources.id))
    .leftJoin(rooms, eq(resources.roomId, rooms.id))
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(and(...conds))
    .orderBy(opts.order === "desc" ? desc(reservations.startAt) : asc(reservations.startAt))
    .limit(opts.limit ?? 500);
  return rows.map(normalize);
}

export async function getReservationView(id: number): Promise<ReservationView | null> {
  const rows = await db
    .select(viewColumns)
    .from(reservations)
    .innerJoin(resources, eq(reservations.resourceId, resources.id))
    .leftJoin(rooms, eq(resources.roomId, rooms.id))
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(eq(reservations.id, id))
    .limit(1);
  return rows[0] ? normalize(rows[0]) : null;
}

export async function listResourcesWithRooms(labId: number) {
  await ensureSeeded();
  const rows = await db
    .select({ resource: resources, roomName: rooms.name })
    .from(resources)
    .leftJoin(rooms, eq(resources.roomId, rooms.id))
    .where(eq(resources.labId, labId))
    .orderBy(asc(resources.sortOrder), asc(resources.name));
  return rows.map((r) => ({ ...r.resource, roomName: r.roomName }));
}

export async function unreadCount(userId: number) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return n;
}

export async function lastNotificationId(userId: number) {
  const [row] = await db
    .select({ m: sql<number>`coalesce(max(${notifications.id}), 0)` })
    .from(notifications)
    .where(eq(notifications.userId, userId));
  return Number(row?.m ?? 0);
}
