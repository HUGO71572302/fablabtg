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
            <stop stopColor="#9AF4C5" />
            <stop offset="0.32" stopColor="#27C983" />
            <stop offset="1" stopColor="#087149" />
          </linearGradient>

          <linearGradient id="cube-left" x1="5" y1="13" x2="20" y2="36">
            <stop stopColor="#18A875" />
            <stop offset="0.48" stopColor="#08724F" />
            <stop offset="1" stopColor="#034332" />
          </linearGradient>

          <linearGradient id="cube-right" x1="20" y1="20" x2="35" y2="34">
            <stop stopColor="#19B982" />
            <stop offset="0.5" stopColor="#087A59" />
            <stop offset="1" stopColor="#034536" />
          </linearGradient>

          <linearGradient id="cube-side-shadow" x1="20" y1="20" x2="20" y2="38">
            <stop stopColor="#07523F" />
            <stop offset="1" stopColor="#021E18" />
          </linearGradient>

          <linearGradient id="cube-gloss" x1="20" y1="5" x2="20" y2="20">
            <stop stopColor="#F4FFF8" stopOpacity="0.68" />
            <stop offset="1" stopColor="#9AF4C5" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="circuit-metal" x1="14" y1="9" x2="26" y2="18">
            <stop stopColor="#FFFFFF" />
            <stop offset="0.52" stopColor="#D7E8E2" />
            <stop offset="1" stopColor="#91B2A7" />
          </linearGradient>

          <radialGradient id="node-metal" cx="0.35" cy="0.28">
            <stop stopColor="#FFFFFF" />
            <stop offset="0.55" stopColor="#E5F2ED" />
            <stop offset="1" stopColor="#99B9AD" />
          </radialGradient>

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
          <ellipse cx="20" cy="35.4" rx="14.7" ry="2.2" fill="#061D18" opacity="0.65" />

          {/* Tranche sombre : donne une épaisseur au cube */}
          <path
            d="M4.5 13.5 20 22.3 35.5 13.5V29L20 37.5 4.5 29V13.5Z"
            fill="url(#cube-side-shadow)"
            stroke="#03271F"
            strokeWidth="0.8"
          />

          {/* Face gauche */}
          <path
            d="M4.5 12.5 20 21.3V36.5L4.5 27.7V12.5Z"
            fill="url(#cube-left)"
            stroke="#68D6A3"
            strokeWidth="0.8"
          />

          {/* Face droite */}
          <path
            d="M20 21.3 35.5 12.5V27.7L20 36.5V21.3Z"
            fill="url(#cube-right)"
            stroke="#77EAC0"
            strokeWidth="0.8"
          />

          {/* Face supérieure */}
          <path
            d="M20 3.5 35.5 12.5 20 21.3 4.5 12.5 20 3.5Z"
            fill="url(#cube-top)"
            stroke="#A0F0C9"
            strokeWidth="1"
          />

          <path
            d="M6 14.1 19.2 21.8V34.2L6 26.9V14.1Z"
            fill="url(#cube-gloss)"
            opacity="0.38"
          />

          <path
            d="M8 12.5 20 5.6 31.7 12.4 20 19.2 8 12.5Z"
            fill="url(#cube-gloss)"
            opacity="0.7"
          />

          {/* Reflet sur l’arête supérieure */}
          <path
            d="M7.5 12.4 20 5.2 32.5 12.4"
            stroke="#E0FFF0"
            strokeOpacity="0.6"
            strokeWidth="0.5"
            strokeLinecap="round"
          />

          {/* Circuit en relief */}
          <path
            d="M20 17.7V9.2M20 13.7 14.6 10.7M20 13.7 25.4 10.7"
            stroke="#073F32"
            strokeWidth="3.1"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M20 17.3V9M20 13.4 14.6 10.4M20 13.4 25.4 10.4"
            stroke="url(#circuit-metal)"
            strokeWidth="2.1"
            strokeLinecap="round"
          />

          <circle cx="20" cy="8.1" r="2.2" fill="url(#node-metal)" stroke="#E7FFF4" strokeWidth="0.35" />
          <circle cx="13.7" cy="10" r="2" fill="url(#node-metal)" stroke="#E7FFF4" strokeWidth="0.35" />
          <circle cx="26.3" cy="10" r="2" fill="url(#node-metal)" stroke="#E7FFF4" strokeWidth="0.35" />
          <circle cx="20" cy="21.3" r="1.45" fill="url(#node-metal)" stroke="#D9FFF0" strokeWidth="0.3" />
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
