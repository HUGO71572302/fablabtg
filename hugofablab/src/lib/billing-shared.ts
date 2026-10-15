/** Plans et textes d'abonnement — sûrs pour le navigateur. Les requêtes DB vivent dans `lib/billing.ts`. */
export type PlanId = "essentiel" | "plus" | "reseau";
export type SubscriptionPhase = "trial" | "active" | "pending" | "expired" | "suspended";

export const TRIAL_DURATION_MINUTES = 720;

export const BILLING_PLANS: Record<PlanId, {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  accent: string;
  tagline: string;
  description: string;
  features: string[];
}> = {
  essentiel: {
    id: "essentiel",
    name: "Essentiel",
    monthlyPrice: 5500,
    accent: "Le nécessaire pour faire vivre un atelier.",
    tagline: "Pour un lab qui démarre",
    description: "Réservations, élèves, machines, projets et suivi de base.",
    features: ["Jusqu’à 150 apprenants", "Réservations & calendrier", "Machines, salles et stock", "Projets et fiches imprimables"],
  },
  plus: {
    id: "plus",
    name: "Plus",
    monthlyPrice: 8500,
    accent: "La formule recommandée pour l’école.",
    tagline: "Pour un atelier qui grandit",
    description: "Tout Essentiel, avec un suivi pédagogique et stock avancé pour toute l’école.",
    features: ["Apprenants illimités", "Suivi pédagogique complet", "Journal de stock & reçus", "Support prioritaire WhatsApp"],
  },
  reseau: {
    id: "reseau",
    name: "Réseau",
    monthlyPrice: 12500,
    accent: "Pour les établissements qui avancent ensemble.",
    tagline: "Pour plusieurs ateliers",
    description: "Une formule élargie pour un réseau d’ateliers ou plusieurs établissements.",
    features: ["Tout Plus", "Jusqu’à 5 FabLabs", "Accompagnement de déploiement", "Bilan d’activité consolidé"],
  },
};

export const PLAN_LIST = Object.values(BILLING_PLANS);
export const PLAN_LABEL: Record<PlanId, string> = Object.fromEntries(PLAN_LIST.map((p) => [p.id, p.name])) as Record<PlanId, string>;
export const validPlan = (value: unknown): value is PlanId => typeof value === "string" && value in BILLING_PLANS;
export const planPrice = (plan: PlanId, months = 1) => BILLING_PLANS[plan].monthlyPrice * Math.max(1, Math.min(12, Math.round(months)));

export const PHASE_LABEL: Record<SubscriptionPhase, string> = {
  trial: "Essai gratuit",
  active: "Abonnement actif",
  pending: "Paiement à valider",
  expired: "Abonnement expiré",
  suspended: "Accès suspendu",
};

export function formatXof(amount: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount) + " FCFA";
}
