"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { media, projects } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { CLASS_LEVELS } from "@/lib/labels";
import { saveImage } from "@/lib/media";
import { notifyAdmins } from "@/lib/reservations";
import type { ActionState } from "./auth";
import type { SimpleResult } from "./reservations";

/** Ajout d'un projet réalisé : publié directement par le responsable, soumis à validation s'il vient d'un élève. */
export async function saveProjectAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const title = String(fd.get("title") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim() || null;
  const authors = String(fd.get("authors") ?? "").trim() || user.name;
  const classRaw = String(fd.get("classLevel") ?? "");
  const classLevel = CLASS_LEVELS.some((c) => c.value === classRaw) ? classRaw : user.classLevel;
  const machines = String(fd.get("machines") ?? "").trim() || null;
  if (title.length < 3) return { error: "Donnez un titre au projet (3 caractères minimum)." };
  let photoId: number | null = null;
  try {
    photoId = await saveImage(fd.get("photo"), user.labId, 1600);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Photo invalide." };
  }
  if (!photoId) return { error: "Ajoutez une photo du projet." };
  const isAdmin = user.role === "fabmanager";
  await db.insert(projects).values({ labId: user.labId, title, description, authors, classLevel, machines, photoId, submittedBy: user.id, published: isAdmin });
  if (!isAdmin) await notifyAdmins(user.labId, "info", "🖼️ Nouveau projet à valider", `${user.name} a proposé le projet « ${title} » pour la galerie du lab.`);
  revalidatePath("/", "layout");
  return { success: isAdmin ? "Projet publié dans la galerie du lab." : "Projet envoyé ! Il apparaîtra dans la galerie après validation du responsable." };
}

export async function setProjectPublishedAction(id: number, published: boolean): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const res = await db
    .update(projects)
    .set({ published })
    .where(and(eq(projects.id, id), eq(projects.labId, admin.labId)))
    .returning({ id: projects.id });
  if (!res.length) return { error: "Projet introuvable." };
  revalidatePath("/", "layout");
  return { success: published ? "Projet publié." : "Projet retiré de la galerie." };
}

export async function updatePublishedProjectAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Projet invalide." };
  const [project] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.labId, admin.labId), eq(projects.published, true))).limit(1);
  if (!project) return { error: "Projet publié introuvable dans votre lab." };

  const title = String(fd.get("title") ?? "").trim();
  if (title.length < 3) return { error: "Donnez un titre au projet (3 caractères minimum)." };
  const classRaw = String(fd.get("classLevel") ?? "");
  const classLevel = CLASS_LEVELS.some((c) => c.value === classRaw) ? classRaw : null;
  let photoId: number | null = null;
  try {
    photoId = await saveImage(fd.get("photo"), admin.labId, 1600);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Photo invalide." };
  }

  await db.update(projects).set({
    title,
    description: String(fd.get("description") ?? "").trim() || null,
    authors: String(fd.get("authors") ?? "").trim() || null,
    classLevel,
    machines: String(fd.get("machines") ?? "").trim() || null,
    ...(photoId ? { photoId } : {}),
  }).where(and(eq(projects.id, id), eq(projects.labId, admin.labId), eq(projects.published, true)));
  if (photoId && project.photoId) {
    await db.delete(media).where(and(eq(media.id, project.photoId), eq(media.labId, admin.labId)));
  }
  revalidatePath("/", "layout");
  return { success: "Projet publié mis à jour." };
}

export async function deleteProjectAction(id: number): Promise<SimpleResult> {
  const user = await requireUser();
  const [p] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.labId, user.labId))).limit(1);
  if (!p) return { error: "Projet introuvable." };
  const allowed = user.role === "fabmanager" || (p.submittedBy === user.id && !p.published);
  if (!allowed) return { error: "Action non autorisée." };
  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath("/", "layout");
  return { success: "Projet supprimé." };
}
