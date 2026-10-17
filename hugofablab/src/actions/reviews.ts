"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userReviews } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";

export type ReviewActionState = { error?: string; success?: string } | null;

/** Un avis par membre et par lab ; toute modification retourne en attente de modération. */
export async function submitReviewAction(_: ReviewActionState, fd: FormData): Promise<ReviewActionState> {
  const user = await requireUser();
  if (user.role === "fabmanager") return { error: "Les avis sont réservés aux membres du FabLab." };
  const rating = Number(fd.get("rating"));
  const message = String(fd.get("message") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choisissez une note de 1 à 5 étoiles." };
  if (message.length < 10) return { error: "Votre avis doit contenir au moins 10 caractères." };
  if (message.length > 1000) return { error: "Votre avis ne peut pas dépasser 1 000 caractères." };

  await db.insert(userReviews).values({ labId: user.labId, userId: user.id, rating, message })
    .onConflictDoUpdate({
      target: userReviews.userId,
      set: { rating, message, published: false, featured: false, updatedAt: new Date() },
    });
  revalidatePath("/app/avis");
  revalidatePath("/admin/avis");
  return { success: "Merci pour votre avis ! Il sera visible après validation du responsable." };
}

export async function setReviewStatusAction(id: number, status: "publish" | "unpublish" | "feature" | "unfeature"): Promise<{ error?: string; success?: string }> {
  const admin = await requireAdmin();
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Avis invalide." };
  if (!(status === "publish" || status === "unpublish" || status === "feature" || status === "unfeature")) return { error: "Action invalide." };
  const [review] = await db.select({ id: userReviews.id }).from(userReviews)
    .where(and(eq(userReviews.id, id), eq(userReviews.labId, admin.labId))).limit(1);
  if (!review) return { error: "Avis introuvable dans votre lab." };

  const values = status === "publish"
    ? { published: true }
    : status === "unpublish"
      ? { published: false, featured: false }
      : status === "feature"
        ? { published: true, featured: true }
        : { featured: false };
  await db.update(userReviews).set({ ...values, updatedAt: new Date() })
    .where(and(eq(userReviews.id, id), eq(userReviews.labId, admin.labId)));
  revalidatePath("/app/avis");
  revalidatePath("/admin/avis");
  return { success: status === "publish" ? "Avis publié." : status === "unpublish" ? "Avis retiré de l’affichage." : status === "feature" ? "Avis mis en avant." : "Avis retiré de la sélection mise en avant." };
}
