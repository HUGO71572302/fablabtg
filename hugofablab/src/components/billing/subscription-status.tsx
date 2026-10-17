"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, CreditCard, ShieldAlert } from "lucide-react";
import { Badge, cn } from "@/components/ui";
import { BILLING_PLANS, PHASE_LABEL, TRIAL_DURATION_MINUTES, type PlanId, type SubscriptionPhase } from "@/lib/billing-shared";

function remainingLabel(seconds: number) {
  if (seconds <= 0) return "terminé";
  const days = Math.floor(seconds / 86400);
  if (days) return `${days} j ${Math.floor((seconds % 86400) / 3600)} h restantes`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h} h ${String(m).padStart(2, "0")} min`;
  return `${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`;
}

/** Carte de statut de l'essai / abonnement, avec minuteur réel pour les 30 jours offertes. */
export function SubscriptionStatus({ phase, plan, endsAt, accessAvailable }: { phase: SubscriptionPhase; plan: PlanId; endsAt: string; accessAvailable: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const end = new Date(endsAt).getTime();
  useEffect(() => {
    if (phase !== "trial") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);
  const remaining = Math.max(0, Math.floor((end - now) / 1000));
  const icon = phase === "active" ? CheckCircle2 : phase === "trial" ? Clock3 : phase === "pending" ? CreditCard : ShieldAlert;
  const Icon = icon;
  const tone = phase === "active" ? "bg-togo-green/10 text-togo-green dark:text-lime" : phase === "trial" ? "bg-lime text-forest" : phase === "pending" ? "bg-togo-yellow/20 text-amber-700 dark:text-togo-yellow" : "bg-togo-red/10 text-togo-red";
  const title = phase === "trial" ? `Essai gratuit · ${remainingLabel(remaining)}` : PHASE_LABEL[phase];
  const description = phase === "trial"
    ? `Toutes les fonctionnalités sont ouvertes pendant 30 jours. Votre essai se termine le ${new Date(endsAt).toLocaleDateString("fr-FR")}.`
    : phase === "active"
      ? `La formule ${BILLING_PLANS[plan].name} est active jusqu’au ${new Date(endsAt).toLocaleDateString("fr-FR")}.`
      : phase === "pending"
        ? accessAvailable
          ? `Votre preuve de paiement est en cours de vérification. Vous pouvez continuer à utiliser le lab jusqu’au ${new Date(endsAt).toLocaleDateString("fr-FR")}. N’envoyez pas une deuxième demande. En cas de retard, contactez le responsable de la plateforme.`
          : "Le délai d’accès temporaire est terminé. Votre preuve est toujours en cours de vérification : ne payez pas une deuxième fois et contactez le responsable de la plateforme."
        : phase === "expired"
          ? "Votre essai ou votre abonnement est terminé. L’accès au lab est suspendu, mais vos données sont conservées. Le responsable du lab peut choisir une formule et envoyer une demande de renouvellement."
          : "L’accès de ce lab a été suspendu par la plateforme. Contactez le responsable de la plateforme pour connaître la marche à suivre.";
  return (
    <div className="rounded-[20px] border border-border bg-card p-5 surface-shadow">
      <div className="flex items-start gap-3">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", tone)}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="text-[16px] font-extrabold">{title}</p><Badge tone={phase === "active" ? "green" : phase === "trial" ? "yellow" : phase === "pending" ? "yellow" : "red"}>{PHASE_LABEL[phase]}</Badge></div>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {phase === "trial" && <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-togo-green transition-[width] duration-1000 dark:bg-lime" style={{ width: `${Math.max(0, Math.min(100, remaining / (TRIAL_DURATION_MINUTES * 60) * 100))}%` }} /></div>}
    </div>
  );
}
