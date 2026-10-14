"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { grades, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import type { GradeKind } from "@/lib/pedagogy";
import type { ActionState } from "./auth";

function revalidateAll() {
  revalidatePath("/", "layout");
}

const validKind = (v: unknown): GradeKind => (v === "observation" ? "observation" : "note");

/** Saisie d'une note ou d'une observation pour un apprenant du lab (responsable uniquement). */
export async function saveGradeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = Number(fd.get("userId") || 0);
  const label = String(fd.get("label") ?? "").trim();
  const kind = validKind(fd.get("kind"));
  const maxScore = Math.max(1, Math.min(200, Math.round(Number(fd.get("maxScore") || 20))));
  const rawScore = fd.get("score");
  const comment = String(fd.get("comment") ?? "").trim().slice(0, 600) || null;
  const dateStr = String(fd.get("gradedAt") ?? "");
  const gradedAt = dateStr && !Number.isNaN(new Date(`${dateStr}T12:00:00Z`).getTime()) ? new Date(`${dateStr}T12:00:00Z`) : new Date();

  if (label.length < 2) return { error: "Intitulé requis (ex. « Évaluation laser »)." };
  const score = kind === "note" ? Number(rawScore) : null;
  if (kind === "note") {
    if (rawScore == null || rawScore === "" || !Number.isFinite(Number(rawScore))) return { error: "Indiquez la note obtenue." };
    if (Number(rawScore) < 0 || Number(rawScore) > maxScore) return { error: `La note doit être comprise entre 0 et ${maxScore}.` };
  }
  const [learner] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!learner) return { error: "Apprenant introuvable." };
  if (learner.labId !== admin.labId) return { error: "Cet apprenant n'appartient pas à votre lab." };

  await db.insert(grades).values({
    labId: admin.labId,
    userId,
    label,
    kind,
    score: score == null ? null : Math.round(score),
    maxScore,
    gradedAt,
    comment,
    createdBy: admin.id,
  });
  revalidateAll();
  return { success: kind === "note" ? `Note de ${score}/${maxScore} enregistrée pour ${learner.name}.` : `Observation enregistrée pour ${learner.name}.` };
}

/** Suppression d'une évaluation (lab scoppé). */
export async function deleteGradeAction(id: number): Promise<{ error?: string; success?: string }> {
  const admin = await requireAdmin();
  const deleted = await db.delete(grades).where(and(eq(grades.id, id), eq(grades.labId, admin.labId))).returning({ id: grades.id });
  if (!deleted.length) return { error: "Évaluation introuvable." };
  revalidateAll();
  return { success: "Évaluation supprimée." };
}
