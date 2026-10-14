"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, CreditCard, ShieldAlert } from "lucide-react";
import { Badge, cn } from "@/components/ui";
import { BILLING_PLANS, PHASE_LABEL, type PlanId, type SubscriptionPhase } from "@/lib/billing-shared";

function remainingLabel(seconds: number) {
  if (seconds <= 0) return "terminé";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h} h ${String(m).padStart(2, "0")} min`;
  return `${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`;
}

/** Carte de statut de l'essai / abonnement, avec minuteur réel pour les 10 minutes offertes. */
export function SubscriptionStatus({ phase, plan, endsAt }: { phase: SubscriptionPhase; plan: PlanId; endsAt: string }) {
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
    ? "Toutes les fonctionnalités sont ouvertes pendant 10 minutes à partir de la création de votre lab."
    : phase === "active"
      ? `${BILLING_PLANS[plan].name} actif jusqu’au ${new Date(endsAt).toLocaleDateString("fr-FR")}.`
      : phase === "pending"
        ? "Votre preuve est en attente de validation. Vous recevrez la réactivation dès vérification."
        : "Choisissez une formule puis déposez votre référence Mobile Money pour réactiver le lab.";
  return (
    <div className="rounded-[20px] border border-border bg-card p-5 surface-shadow">
      <div className="flex items-start gap-3">
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", tone)}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="text-[16px] font-extrabold">{title}</p><Badge tone={phase === "active" ? "green" : phase === "trial" ? "yellow" : phase === "pending" ? "yellow" : "red"}>{PHASE_LABEL[phase]}</Badge></div>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {phase === "trial" && <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-togo-green transition-[width] duration-1000 dark:bg-lime" style={{ width: `${Math.max(0, Math.min(100, remaining / 600 * 100))}%` }} /></div>}
    </div>
  );
}
