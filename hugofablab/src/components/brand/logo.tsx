import { cn } from "@/components/ui";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-forest text-white", className)}>
      <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7" aria-hidden="true">
        <path d="m16 3 11 6.4v12.8L16 29 5 22.2V9.4L16 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="m5 9.5 11 6.4 11-6.4M16 16v13M16 3v6.5m0 0-5.5 3.2m5.5-3.2 5.5 3.2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M16 16v5.5l4.7-2.7V13.3L16 16Z" fill="#d6e8b5" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-togo-yellow" />
    </span>
  );
}

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark className={light ? "bg-white/10" : undefined} />
      {!compact && (
        <span className="leading-tight">
          <span className={cn("block font-display text-[17px] font-extrabold tracking-[-0.05em] sm:text-[19px]", light ? "text-white" : "text-foreground")}>
            HUGO<span className={light ? "ml-1.5 text-lime" : "ml-1.5 text-togo-green dark:text-lime"}>FABLAB</span>
          </span>
          <span className={cn("mt-0.5 block text-[13px] font-medium tracking-[0.12em]", light ? "text-white/70" : "text-muted-foreground")}>
            L&apos;ATELIER DES POSSIBLES
          </span>
        </span>
      )}
    </span>
  );
}
