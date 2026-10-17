"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "@/lib/dates";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { labSubscriptions, paymentRequests } from "@/db/schema";
import { requireBillingUser, requirePlatformAdmin } from "@/lib/auth";
import { BILLING_PLANS, getSubscriptionAccess, newPaymentReference, planPrice, validPlan, type PlanId } from "@/lib/billing";
import { saveImage } from "@/lib/media";
import type { ActionState } from "./auth";

function revalidateAll() { revalidatePath("/", "layout"); }
const PROVIDERS = ["tmoney", "flooz", "autre"] as const;
const validProvider = (v: unknown): v is (typeof PROVIDERS)[number] => PROVIDERS.includes(v as (typeof PROVIDERS)[number]);

/**
 * Réactivation gratuite côté plateforme : le responsable paie via Mobile Money puis dépose sa référence.
 * Aucun API payant n'est nécessaire : Hugo valide la preuve depuis Gestion des abonnements.
 */
export async function createPaymentRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireBillingUser();
  if ((await getSubscriptionAccess(user.labId)).exempt) return { error: "Le lab du responsable de la plateforme bénéficie d’un accès gratuit. Aucun abonnement n’est à régler." };
  const planRaw = String(fd.get("plan") ?? "");
  const rawMonths = fd.get("months");
  const months = rawMonths == null || rawMonths === "" ? 1 : Number(rawMonths);
  const providerRaw = String(fd.get("provider") ?? "");
  const transactionRef = String(fd.get("transactionRef") ?? "").trim().slice(0, 120);
  const payerPhone = String(fd.get("payerPhone") ?? "").trim().slice(0, 30) || null;
  if (!validPlan(planRaw)) return { error: "Choisissez une formule d'abonnement." };
  if (!BILLING_PLANS[planRaw].availableForPurchase) return { error: "La formule Réseau n'est pas encore disponible à la souscription." };
  if (![1, 3, 6, 12].includes(months)) return { error: "Choisissez une durée d'abonnement valide." };
  if (!validProvider(providerRaw)) return { error: "Choisissez TMoney, Flooz ou Autre Mobile Money." };
  if (transactionRef.length < 4) return { error: "Indiquez la référence de la transaction Mobile Money (4 caractères minimum)." };

  const [pending] = await db.select({ id: paymentRequests.id }).from(paymentRequests).where(and(eq(paymentRequests.labId, user.labId), eq(paymentRequests.status, "pending"))).limit(1);
  if (pending) return { error: "Une demande de paiement est déjà en attente de validation. Contactez le support si vous souhaitez la modifier." };

  let proofId: number | null = null;
  try { proofId = await saveImage(fd.get("proof"), user.labId, 1600); }
  catch (e) { return { error: e instanceof Error ? e.message : "Preuve de paiement invalide." }; }

  const amount = planPrice(planRaw, months);
  const reference = newPaymentReference(user.labId);
  await db.insert(paymentRequests).values({
    labId: user.labId,
    requestedBy: user.id,
    plan: planRaw,
    months,
    amount,
    provider: providerRaw,
    payerPhone,
    transactionRef,
    proofId,
    reference,
  });

  const [subscription] = await db.select().from(labSubscriptions).where(eq(labSubscriptions.labId, user.labId)).limit(1);
  // Un lab déjà actif reste utilisable pendant la validation de son renouvellement.
  if (!subscription || subscription.status !== "active" || !subscription.activeUntil || subscription.activeUntil < new Date()) {
    await db.update(labSubscriptions).set({ status: "pending", updatedAt: new Date() }).where(eq(labSubscriptions.labId, user.labId));
  }
  revalidateAll();
  return { success: `Demande ${reference} reçue. Votre lab sera réactivé dès la validation de la transaction.` };
}

/** Hugo / l'administrateur plateforme valide ou refuse une preuve de paiement. */
export async function reviewPaymentAction(id: number, decision: "approve" | "reject", note?: string): Promise<{ error?: string; success?: string }> {
  const platformAdmin = await requirePlatformAdmin();
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Demande invalide." };
  if (decision !== "approve" && decision !== "reject") return { error: "Décision invalide." };
  const [request] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id)).limit(1);
  if (!request) return { error: "Demande introuvable." };
  if (request.status !== "pending") return { error: "Cette demande a déjà été traitée." };
  const adminNote = String(note ?? "").trim().slice(0, 500) || null;
  if (decision === "reject") {
    const [rejected] = await db.update(paymentRequests).set({ status: "rejected", adminNote, reviewedBy: platformAdmin.id, reviewedAt: new Date() }).where(and(eq(paymentRequests.id, id), eq(paymentRequests.status, "pending"))).returning({ id: paymentRequests.id });
    if (!rejected) return { error: "Cette demande a déjà été traitée." };
    revalidateAll();
    return { success: "Paiement refusé. Le responsable peut envoyer une nouvelle demande." };
  }
  if (!validPlan(request.plan) || !BILLING_PLANS[request.plan].availableForPurchase) return { error: "Formule de la demande invalide ou indisponible." };
  if (![1, 3, 6, 12].includes(request.months) || request.amount !== planPrice(request.plan, request.months)) return { error: "Montant ou durée de la demande invalide. Vérifiez la demande avant validation." };
  const [subscription] = await db.select().from(labSubscriptions).where(eq(labSubscriptions.labId, request.labId)).limit(1);
  if (!subscription) return { error: "Abonnement du lab introuvable." };
  const now = new Date();
  const base = subscription?.activeUntil && subscription.activeUntil > now ? subscription.activeUntil : now;
  const activeUntil = addDays(base, request.months * 30);
  const approved = await db.transaction(async (tx) => {
    const [claimed] = await tx.update(paymentRequests).set({ status: "approved", adminNote, reviewedBy: platformAdmin.id, reviewedAt: now }).where(and(eq(paymentRequests.id, id), eq(paymentRequests.status, "pending"))).returning({ id: paymentRequests.id });
    if (!claimed) return false;
    await tx.update(labSubscriptions).set({ plan: request.plan, status: "active", activeFrom: now, activeUntil, lastPaymentAt: now, note: adminNote, updatedAt: now }).where(eq(labSubscriptions.labId, request.labId));
    return true;
  });
  if (!approved) return { error: "Cette demande a déjà été traitée." };
  revalidateAll();
  return { success: `Paiement validé : lab réactivé jusqu'au ${activeUntil.toLocaleDateString("fr-FR")}.` };
}

/** Activation manuelle de secours : garde la validation gratuite sans intégration API Mobile Money. */
export async function grantCourtesyAccessAction(labId: number, days = 1, note?: string): Promise<{ error?: string; success?: string }> {
  const platformAdmin = await requirePlatformAdmin();
  if (!Number.isSafeInteger(labId) || labId <= 0) return { error: "Lab invalide." };
  if (!Number.isFinite(days)) return { error: "Durée invalide." };
  const safeDays = Math.max(1, Math.min(31, Math.round(days)));
  const now = new Date();
  const [subscription] = await db.select().from(labSubscriptions).where(eq(labSubscriptions.labId, labId)).limit(1);
  if (!subscription) return { error: "Abonnement introuvable." };
  const base = subscription.activeUntil && subscription.activeUntil > now ? subscription.activeUntil : now;
  const activeUntil = addDays(base, safeDays);
  await db.update(labSubscriptions).set({ status: "active", activeFrom: now, activeUntil, note: `Accès manuel : ${String(note ?? "").trim() || "validation support"}`, updatedAt: now }).where(eq(labSubscriptions.labId, labId));
  revalidateAll();
  return { success: `Accès accordé pour ${safeDays} jour(s), jusqu'au ${activeUntil.toLocaleDateString("fr-FR")}.` };
}

export async function goToBillingAction() { const user = await requireBillingUser(); redirect(`/abonnement?lab=${user.labId}`); }
