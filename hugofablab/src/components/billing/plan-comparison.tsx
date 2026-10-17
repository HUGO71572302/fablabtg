import { Check, Clock3, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { PLAN_LIST, formatXof } from "@/lib/billing-shared";

export function PlanComparison() {
  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="plans-title">
      <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-togo-green dark:text-lime">Les formules</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 id="plans-title" className="text-[26px] font-extrabold leading-tight tracking-[-0.04em] sm:text-[32px]">Choisissez la formule adaptée à votre lab.</h2>
        <p className="pb-1 text-[13px] text-muted-foreground">Tarifs mensuels</p>
      </div>

      <div className="mt-6 grid items-stretch gap-4 md:grid-cols-3">
        {PLAN_LIST.map((plan) => {
          const highlighted = plan.id === "plus";
          const unavailable = !plan.availableForPurchase;

          return (
            <Card
              key={plan.id}
              className={highlighted ? "border-togo-green ring-1 ring-togo-green/25 dark:border-lime" : unavailable ? "opacity-90" : ""}
            >
              <CardContent className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[21px] font-extrabold tracking-tight">{plan.name}</h3>
                    <p className="mt-1 text-[12px] font-semibold text-muted-foreground">{plan.tagline}</p>
                  </div>
                  {highlighted && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-togo-green/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-togo-green dark:bg-lime/10 dark:text-lime"><Sparkles className="h-3 w-3" /> Recommandée</span>}
                  {unavailable && <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Bientôt disponible</span>}
                </div>

                <div className="mt-5 min-h-[70px]">
                  {unavailable ? (
                    <p className="text-[14px] font-bold text-muted-foreground">Souscription indisponible pour le moment</p>
                  ) : (
                    <p className="font-display text-[28px] font-extrabold leading-none tracking-tight tabular-nums">{formatXof(plan.monthlyPrice)}<span className="ml-1.5 font-sans text-[12px] font-semibold tracking-normal text-muted-foreground">/ mois</span></p>
                  )}
                  <p className="mt-2 text-[13px] leading-5 text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="mt-5 flex-1 space-y-3 border-t border-border pt-4">
                  {plan.features.map((feature, index) => {
                    const upcoming = unavailable && index > 0;
                    const Icon = upcoming ? Clock3 : Check;
                    return (
                      <li key={feature} className="flex gap-2.5 text-[13px] leading-5 text-foreground/85">
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${upcoming ? "text-muted-foreground" : "text-togo-green dark:text-lime"}`} />
                        <span>{feature}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
