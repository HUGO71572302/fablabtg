import type { ReactNode } from "react";
import { Reveal } from "@/components/motion";
import { cn } from "@/components/ui";

/**
 * En-tête de section : numéro d'ordre, surtitre, titre, chapeau et action.
 * Garantit une hiérarchie typographique identique sur toutes les pages publiques.
 */
export function SectionHeading({ index, eyebrow, title, lead, action, tone = "default", className }: {
  index?: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  tone?: "default" | "inverted";
  className?: string;
}) {
  const inverted = tone === "inverted";
  return (
    <div className={cn("mb-9 flex flex-wrap items-end justify-between gap-6", className)}>
      <Reveal variant="group" className="max-w-2xl">
        <p className={cn("eyebrow", inverted ? "text-lime/80" : "text-togo-green dark:text-lime")}>
          {index && <span className={cn("mr-2 font-mono text-[13px] tracking-normal", inverted ? "text-white/70" : "text-muted-foreground")}>{index}</span>}
          {eyebrow}
        </p>
        <h2 className={cn("section-title mt-4", inverted && "text-white")}>
          <span className="mask-line"><span>{title}</span></span>
        </h2>
        {lead && <p className={cn("mt-4 max-w-xl text-[15px] leading-7", inverted ? "text-white/70" : "text-muted-foreground")}>{lead}</p>}
      </Reveal>
      {action && <Reveal variant="left" delay={200}>{action}</Reveal>}
    </div>
  );
}
