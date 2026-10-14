import type { ReactNode } from "react";

/** Bandeau défilant infini (CSS pur, pause au survol, désactivé en mouvement réduit). */
export function Marquee({ items, className = "" }: { items: ReactNode[]; className?: string }) {
  const track = (ariaHidden: boolean) => (
    <ul className="marquee-track" aria-hidden={ariaHidden || undefined}>
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-7">
          <span>{item}</span>
          <span className="marquee-dot" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`marquee ${className}`} role="marquee" aria-label="Ce que l'on fabrique au FabLab">
      <div className="marquee-inner">
        {track(false)}
        {track(true)}
      </div>
    </div>
  );
}
