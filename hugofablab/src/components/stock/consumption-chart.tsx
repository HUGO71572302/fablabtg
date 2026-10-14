import { Reveal } from "@/components/motion";
import { cn } from "@/components/ui";

/** Petites colonnes de consommation (sorties + pertes) sur les 7 derniers jours. */
export function ConsumptionChart({ days, className }: { days: { label: string; value: number }[]; className?: string }) {
  const max = Math.max(1, ...days.map((d) => d.value));
  const total = days.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className={cn("", className)}>
      <div className="flex h-[104px] items-end gap-1.5">
        {days.map((d, i) => (
          <Reveal key={`${d.label}-${i}`} variant="up" index={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[13px] font-bold tabular-nums text-muted-foreground">{d.value || ""}</span>
            <span
              className={cn("w-full rounded-t-md transition-[height] duration-500", d.value ? "bg-togo-green dark:bg-lime" : "bg-muted")}
              style={{ height: `${Math.max(3, Math.round((d.value / max) * 62))}px` }}
            />
            <span className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">{d.label}</span>
          </Reveal>
        ))}
      </div>
      <p className="mt-3 border-t border-border pt-3 text-[13px] font-medium text-muted-foreground">
        <b className="font-display text-[15px] font-extrabold tabular-nums text-foreground">{total}</b> mouvements de sortie sur 7 jours
      </p>
    </div>
  );
}
