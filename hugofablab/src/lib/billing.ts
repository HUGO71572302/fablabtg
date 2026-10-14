import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { labSubscriptions, labs, paymentRequests, users, type LabSubscription } from "@/db/schema";
import { BILLING_PLANS, PLAN_LIST, TRIAL_DURATION_MINUTES, type PlanId, type SubscriptionPhase, validPlan } from "@/lib/billing-shared";

export * from "@/lib/billing-shared";

export type SubscriptionAccess = {
  subscription: LabSubscription;
  phase: SubscriptionPhase;
  access: boolean;
  plan: PlanId;
  endsAt: Date;
  remainingSeconds: number;
};

const trialEnd = () => new Date(Date.now() + TRIAL_DURATION_MINUTES * 60_000);

/** Crée l'essai de 10 min si le lab n'a encore aucun abonnement. */
export async function ensureSubscription(labId: number): Promise<LabSubscription> {
  const [found] = await db.select().from(labSubscriptions).where(eq(labSubscriptions.labId, labId)).limit(1);
  if (found) return found;
  await db.insert(labSubscriptions).values({ labId, plan: "essentiel", status: "trial", trialEndsAt: trialEnd() }).onConflictDoNothing();
  const [created] = await db.select().from(labSubscriptions).where(eq(labSubscriptions.labId, labId)).limit(1);
  return created;
}

export async function getSubscriptionAccess(labId: number): Promise<SubscriptionAccess> {
  const subscription = await ensureSubscription(labId);
  const now = Date.now();
  const plan = validPlan(subscription.plan) ? subscription.plan : "essentiel";
  const trialValid = subscription.status === "trial" && subscription.trialEndsAt.getTime() > now;
  const paidValid = subscription.status === "active" && Boolean(subscription.activeUntil) && subscription.activeUntil!.getTime() > now;
  const phase: SubscriptionPhase = trialValid ? "trial" : paidValid ? "active" : subscription.status === "pending" ? "pending" : subscription.status === "suspended" ? "suspended" : "expired";
  const endsAt = phase === "trial" ? subscription.trialEndsAt : subscription.activeUntil ?? subscription.trialEndsAt;
  return { subscription, phase, access: phase === "trial" || phase === "active", plan, endsAt, remainingSeconds: Math.max(0, Math.floor((endsAt.getTime() - now) / 1000)) };
}

export async function listLabPayments(labId: number) {
  return db.select({ request: paymentRequests, requester: users.name }).from(paymentRequests).leftJoin(users, eq(paymentRequests.requestedBy, users.id)).where(eq(paymentRequests.labId, labId)).orderBy(desc(paymentRequests.id)).limit(30);
}

export async function isPlatformAdmin(user: { email: string | null; role: string }) {
  const configured = (process.env.PLATFORM_ADMIN_EMAILS ?? "hkabrame@gmail.com").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return user.role === "fabmanager" && Boolean(user.email && configured.includes(user.email.toLowerCase()));
}

export async function listPendingPayments() {
  return db
    .select({ request: paymentRequests, labName: labs.name, schoolName: labs.schoolName, requester: users.name })
    .from(paymentRequests)
    .innerJoin(labs, eq(paymentRequests.labId, labs.id))
    .leftJoin(users, eq(paymentRequests.requestedBy, users.id))
    .where(eq(paymentRequests.status, "pending"))
    .orderBy(desc(paymentRequests.id));
}

export async function listPaymentHistory() {
  return db
    .select({ request: paymentRequests, labName: labs.name, schoolName: labs.schoolName, requester: users.name })
    .from(paymentRequests)
    .innerJoin(labs, eq(paymentRequests.labId, labs.id))
    .leftJoin(users, eq(paymentRequests.requestedBy, users.id))
    .where(inArray(paymentRequests.status, ["approved", "rejected"]))
    .orderBy(desc(paymentRequests.id));
}

export function paymentRecipient() {
  return {
    tmoney: process.env.MOBILE_MONEY_TMOONEY_NUMBER?.trim() || "96 93 38 93",
    flooz: process.env.MOBILE_MONEY_FLOOZ_NUMBER?.trim() || "96 93 38 93",
    name: process.env.MOBILE_MONEY_RECIPIENT_NAME?.trim() || "HUGO FABLAB",
  };
}

export function newPaymentReference(labId: number) {
  return `ABO-${labId}-${Date.now().toString(36).toUpperCase()}`;
}
