import { cn } from "@/components/ui";

type BrandMarkProps = {
  className?: string;
};

type LogoProps = {
  compact?: boolean;
  light?: boolean;
};

/**
 * Symbole HUGO FABLAB
 * Cube : fabrication et prototypage
 * Réseau : électronique et innovation
 * Accent jaune : énergie et créativité
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      role="img"
      aria-label="HUGO FABLAB"
      className={cn(
        "relative inline-flex h-11 w-11 shrink-0",
        "items-center justify-center rounded-[14px]",
        "bg-forest text-white",
        className
      )}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className="h-9 w-9 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="cube-top" x1="8" y1="5" x2="31" y2="22">
            <stop stopColor="#22C55E" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="cube-left" x1="5" y1="13" x2="20" y2="36">
            <stop stopColor="#059669" />
            <stop offset="1" stopColor="#064E3B" />
          </linearGradient>

          <linearGradient id="cube-right" x1="20" y1="20" x2="35" y2="34">
            <stop stopColor="#10B981" />
            <stop offset="1" stopColor="#065F46" />
          </linearGradient>

          <filter id="cube-shadow" x="-20%" y="-15%" width="150%" height="160%">
            <feDropShadow
              dx="0"
              dy="1.5"
              stdDeviation="1.2"
              floodColor="#022C22"
              floodOpacity="0.55"
            />
          </filter>
        </defs>

        <g filter="url(#cube-shadow)" strokeLinejoin="round">
          {/* Tranche sombre : donne une épaisseur au cube */}
          <path
            d="M4.5 13.5 20 22.3 35.5 13.5V29L20 37.5 4.5 29V13.5Z"
            fill="#064E3B"
            stroke="#022C22"
            strokeWidth="1"
          />

          {/* Face gauche */}
          <path
            d="M4.5 12.5 20 21.3V36.5L4.5 27.7V12.5Z"
            fill="url(#cube-left)"
            stroke="#34D399"
            strokeWidth="1.2"
          />

          {/* Face droite */}
          <path
            d="M20 21.3 35.5 12.5V27.7L20 36.5V21.3Z"
            fill="url(#cube-right)"
            stroke="#6EE7B7"
            strokeWidth="1.2"
          />

          {/* Face supérieure */}
          <path
            d="M20 3.5 35.5 12.5 20 21.3 4.5 12.5 20 3.5Z"
            fill="url(#cube-top)"
            stroke="#6EE7B7"
            strokeWidth="1.3"
          />

          {/* Reflet sur l’arête supérieure */}
          <path
            d="M7.5 12.4 20 5.2 32.5 12.4"
            stroke="#A7F3D0"
            strokeOpacity="0.7"
            strokeWidth="0.8"
            strokeLinecap="round"
          />

          {/* Circuit en relief */}
          <path
            d="M20 17.5V9M20 13.5 14.5 10.5M20 13.5 25.5 10.5"
            stroke="#F8FAFC"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M20 17.5V9M20 13.5 14.5 10.5M20 13.5 25.5 10.5"
            stroke="#CBD5E1"
            strokeOpacity="0.55"
            strokeWidth="0.7"
            strokeLinecap="round"
          />

          <circle cx="20" cy="8" r="2.1" fill="#FFFFFF" />
          <circle cx="13.7" cy="10" r="1.9" fill="#FFFFFF" />
          <circle cx="26.3" cy="10" r="1.9" fill="#FFFFFF" />
          <circle cx="20" cy="21.3" r="1.5" fill="#F8FAFC" />
        </g>
      </svg>

      <span
        aria-hidden="true"
        className={cn(
          "absolute -right-0.5 -top-0.5",
          "h-2.5 w-2.5 rounded-full",
          "border-2 border-background bg-togo-yellow",
          "shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
        )}
      />
    </span>
  );
}

/**
 * Logo complet ou compact
 */
export function Logo({
  compact = false,
  light = false,
}: LogoProps) {
  return (
    <span
      className="inline-flex items-center gap-2.5"
      aria-label={!compact ? undefined : "HUGO FABLAB"}
    >
      <BrandMark
        className={cn(
          light && "bg-white/10"
        )}
      />

      {!compact && (
        <span className="min-w-0 leading-tight">
          <span
            className={cn(
              "flex items-baseline whitespace-nowrap",
              "font-display text-[17px] font-extrabold",
              "tracking-[-0.045em] sm:text-[19px]",
              light ? "text-white" : "text-foreground"
            )}
          >
            <span>HUGO</span>

            <span
              className={cn(
                "ml-1.5 tracking-[-0.035em]",
                light
                  ? "text-lime"
                  : "text-togo-green dark:text-lime"
              )}
            >
              FABLAB
            </span>
          </span>

          <span
            className={cn(
              "mt-1 block text-[10px] font-semibold",
              "uppercase tracking-[0.13em]",
              "sm:text-[11px]",
              light
                ? "text-white/75"
                : "text-muted-foreground"
            )}
          >
            Apprendre · Créer · Innover
          </span>
        </span>
      )}
    </span>
  );
}