/** Suivi pédagogique : numérotation des fiches par classe, notes et observations. */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { grades, users, type Grade } from "@/db/schema";
import type { GradeStats, GradeView, LearnerRow } from "@/lib/pedagogy-shared";

export * from "@/lib/pedagogy-shared";

/** Code de classe : 6E, TLE-D2, 1RE-C1… (sans accent ni caractère parasite). */
export function classCode(classLevel: string | null | undefined, section?: string | null): string {
  const base = (classLevel ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!base) return "EXT";
  const sec = (section ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return sec ? `${base}-${sec}` : base;
}

/** N° de fiche dans une classe : CODE-NNN, la séquence repart à 001 pour chaque classe. */
export function sheetNumberFor(classLevel: string | null | undefined, section: string | null | undefined, rank: number): string {
  return `${classCode(classLevel, section)}-${String(rank).padStart(3, "0")}`;
}

/** Attribue (ou récupère) le n° de fiche dans la classe, stable et propre à chaque lab. */
export async function assignSheetNumber(user: {
  id: number;
  labId: number | null;
  classLevel: string | null;
  organisation: string | null;
  sheetNumber: string | null;
}): Promise<string | null> {
  if (!user.labId || user.sheetNumber) return user.sheetNumber;
  const code = classCode(user.classLevel, user.organisation);
  for (let attempt = 0; attempt < 4; attempt++) {
    const rows = await db
      .select({ sheetNumber: users.sheetNumber })
      .from(users)
      .where(and(eq(users.labId, user.labId), sql`${users.sheetNumber} like ${`${code}-%`}`));
    const ranks = rows.map((r) => Number(r.sheetNumber?.split("-").pop())).filter((n) => Number.isFinite(n));
    const candidate = sheetNumberFor(user.classLevel, user.organisation, Math.max(0, ...ranks) + 1);
    try {
      await db.update(users).set({ sheetNumber: candidate }).where(eq(users.id, user.id));
      return candidate;
    } catch {
      /* course avec un autre élève de la même classe : on recalcule */
    }
  }
  return null;
}

const toView = (g: Grade, author: string | null): GradeView => ({
  id: g.id,
  label: g.label,
  kind: g.kind,
  score: g.score,
  maxScore: g.maxScore,
  comment: g.comment,
  gradedAt: g.gradedAt.toISOString(),
  author,
});

export async function listGrades(userId: number, limit = 100): Promise<GradeView[]> {
  const rows = await db
    .select({ g: grades, author: users.name })
    .from(grades)
    .leftJoin(users, eq(grades.createdBy, users.id))
    .where(eq(grades.userId, userId))
    .orderBy(desc(grades.gradedAt), desc(grades.id))
    .limit(limit);
  return rows.map(({ g, author }) => toView(g, author));
}

/** Note moyenne ramenée sur 20, quel que soit le barème de chaque évaluation. */
export async function gradesStats(userId: number): Promise<GradeStats> {
  const [row] = await db
    .select({
      notes: sql<number>`count(*) filter (where ${grades.kind} = 'note' and ${grades.score} is not null)`,
      observations: sql<number>`count(*) filter (where ${grades.kind} <> 'note')`,
      moyenne: sql<number | null>`avg((${grades.score}::numeric * 20) / nullif(${grades.maxScore}, 0)) filter (where ${grades.kind} = 'note' and ${grades.score} is not null)`,
      best: sql<number | null>`max((${grades.score}::numeric * 20) / nullif(${grades.maxScore}, 0)) filter (where ${grades.kind} = 'note' and ${grades.score} is not null)`,
      worst: sql<number | null>`min((${grades.score}::numeric * 20) / nullif(${grades.maxScore}, 0)) filter (where ${grades.kind} = 'note' and ${grades.score} is not null)`,
    })
    .from(grades)
    .where(eq(grades.userId, userId));
  const round = (v: number | null) => (v == null ? null : Math.round(Number(v) * 10) / 10);
  return {
    notes: Number(row?.notes ?? 0),
    observations: Number(row?.observations ?? 0),
    moyenne: round(row?.moyenne ?? null),
    best: round(row?.best ?? null),
    worst: round(row?.worst ?? null),
  };
}

/** Tous les apprenants du lab avec leur synthèse pédagogique. */
export async function learnersWithStats(labId: number): Promise<LearnerRow[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      phone: users.phone,
      classLevel: users.classLevel,
      section: users.organisation,
      sheetNumber: users.sheetNumber,
      active: users.active,
      notes: sql<number>`count(grades.id) filter (where grades.kind = 'note' and grades.score is not null)`,
      observations: sql<number>`count(grades.id) filter (where grades.kind <> 'note')`,
      moyenne: sql<number | null>`avg((grades.score::numeric * 20) / nullif(grades.max_score, 0)) filter (where grades.kind = 'note' and grades.score is not null)`,
      lastAt: sql<string | null>`to_char(max(grades.graded_at), 'YYYY-MM-DD')`,
    })
    .from(users)
    .leftJoin(grades, eq(grades.userId, users.id))
    .where(and(eq(users.labId, labId), eq(users.role, "student")))
    .groupBy(users.id)
    .orderBy(users.classLevel, users.organisation, users.sheetNumber, users.name);
  return rows.map((r) => ({
    ...r,
    notes: Number(r.notes),
    observations: Number(r.observations),
    moyenne: r.moyenne == null ? null : Math.round(Number(r.moyenne) * 10) / 10,
    lastAt: r.lastAt,
  }));
}

/**
 * Position de la fiche dans sa classe : « 3 sur 12 ».
 * La classe est celle du numéro de fiche (niveau + série, ex. TLE-D2) : même clé de numérotation,
 * donc la position affichée correspond toujours au suffixe -003 du n° de fiche.
 */
export async function classRank(user: { id: number; labId: number | null; classLevel: string | null; organisation: string | null }): Promise<{ code: string; rank: number; total: number } | null> {
  if (!user.labId) return null;
  const code = classCode(user.classLevel, user.organisation);
  const roster = await db
    .select({ id: users.id, classLevel: users.classLevel, organisation: users.organisation, sheetNumber: users.sheetNumber, createdAt: users.createdAt })
    .from(users)
    .where(and(eq(users.labId, user.labId), eq(users.role, "student")))
    .orderBy(users.createdAt);
  const classmates = roster
    .filter((r) => classCode(r.classLevel, r.organisation) === code)
    .sort((a, b) => (a.sheetNumber ?? "").localeCompare(b.sheetNumber ?? "") || a.createdAt.getTime() - b.createdAt.getTime());
  if (!classmates.length) return null;
  const index = classmates.findIndex((r) => r.id === user.id);
  return { code, rank: index + 1, total: classmates.length };
}
