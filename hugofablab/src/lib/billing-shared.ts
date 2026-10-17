/** Plans et textes d'abonnement — sûrs pour le navigateur. Les requêtes DB vivent dans `lib/billing.ts`. */
export type PlanId = "essentiel" | "plus" | "reseau";
export type SubscriptionPhase = "trial" | "active" | "pending" | "expired" | "suspended";

export const TRIAL_DURATION_MINUTES = 30 * 24 * 60;
export const PENDING_GRACE_PERIOD_DAYS = 3;

export const BILLING_PLANS: Record<PlanId, {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  accent: string;
  tagline: string;
  description: string;
  features: string[];
  availableForPurchase: boolean;
}> = {
  essentiel: {
    id: "essentiel",
    name: "Essentiel",
    monthlyPrice: 5500,
    accent: "Le nécessaire pour faire vivre un atelier.",
    tagline: "Pour un lab qui démarre",
    description: "Jusqu’à 150 apprenants, réservations, machines, stock courant et projets.",
    features: ["Jusqu’à 150 apprenants", "Réservations & calendrier", "Machines, salles et stock", "Projets et fiches imprimables"],
    availableForPurchase: true,
  },
  plus: {
    id: "plus",
    name: "Plus",
    monthlyPrice: 8500,
    accent: "La formule recommandée pour l’école.",
    tagline: "Pour un atelier qui grandit",
    description: "Tout Essentiel, avec les inscriptions sans plafond, la gestion du suivi pédagogique et l’historique détaillé du stock.",
    features: ["Apprenants sans plafond", "Saisie et gestion des notes et observations", "Journal de stock et reçus imprimables", "Exports et impressions détaillés"],
    availableForPurchase: true,
  },
  reseau: {
    id: "reseau",
    name: "Réseau",
    monthlyPrice: 12500,
    accent: "Les fonctions multi-FabLabs sont en préparation.",
    tagline: "Bientôt disponible",
    description: "La gestion de plusieurs FabLabs et le bilan consolidé ne sont pas encore disponibles. Cette formule ne peut pas être souscrite pour le moment.",
    features: ["Tout le contenu de la formule Plus", "Gestion de plusieurs FabLabs prévue", "Bilan d’activité consolidé prévu"],
    availableForPurchase: false,
  },
};

export const PLAN_LIST = Object.values(BILLING_PLANS);
export const PURCHASABLE_PLAN_LIST = PLAN_LIST.filter((plan) => plan.availableForPurchase);
export const PLAN_LABEL: Record<PlanId, string> = Object.fromEntries(PLAN_LIST.map((p) => [p.id, p.name])) as Record<PlanId, string>;
export const validPlan = (value: unknown): value is PlanId => typeof value === "string" && value in BILLING_PLANS;
export const planPrice = (plan: PlanId, months = 1) => BILLING_PLANS[plan].monthlyPrice * Math.max(1, Math.min(12, Math.round(months)));

export const PHASE_LABEL: Record<SubscriptionPhase, string> = {
  trial: "Essai gratuit",
  active: "Abonnement actif",
  pending: "Paiement en vérification",
  expired: "Abonnement expiré",
  suspended: "Accès suspendu",
};

export function formatXof(amount: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount) + " FCFA";
}
