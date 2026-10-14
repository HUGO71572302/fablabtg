"use client";

import type React from "react";
import { Children, cloneElement, isValidElement, useEffect, useRef, type CSSProperties, type ElementType, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import { observe } from "./use-in-view";

export type RevealVariant = "up" | "down" | "left" | "right" | "scale" | "blur" | "clip" | "line" | "group";

type Props = HTMLAttributes<HTMLElement> & {
  /** Balise HTML rendue (div par défaut). Une chaîne uniquement : un composant ne peut pas traverser la frontière serveur → client. */
  as?: keyof React.JSX.IntrinsicElements;
  variant?: RevealVariant;
  /** Délai additionnel en ms (en plus de l'index de stagger). */
  delay?: number;
  /** Index de stagger : chaque unité ajoute 85 ms. */
  index?: number;
  /** Rejouer l'animation à chaque entrée dans le viewport. */
  repeat?: boolean;
  children?: ReactNode;
};

/**
 * Élément révélé à l'entrée dans le viewport.
 * - Sans JavaScript : tout reste visible (les styles masquants ne s'appliquent que sous `html.js`).
 * - `prefers-reduced-motion` : aucune animation.
 * - Variantes : up / down / left / right / scale / blur / clip (rideau) / line (trait) / group (déclencheur pour les enfants `.mask-line`).
 *
 * Détail d'implémentation : pour `clip` et `line`, le masquage est porté par un calque interne (`.reveal-layer`) et non par
 * l'hôte observé. Un élément clippé à zéro a une boîte d'intersection vide et ne serait jamais détecté par l'IntersectionObserver.
 */
export function Reveal({ as: Tag = "div", variant = "up", delay = 0, index, repeat = false, children, style, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("in");
      return;
    }
    return observe(el, (entry) => {
      if (entry.isIntersecting) el.classList.add("in");
      else if (repeat) el.classList.remove("in");
    });
  }, [repeat]);
  const vars = { ...(style ?? {}), ...(delay ? { "--delay": `${delay}ms` } : {}), ...(index !== undefined ? { "--i": index } : {}) } as CSSProperties;
  const Component = Tag as ElementType;
  const layered = variant === "clip" || variant === "line";
  return (
    <Component ref={ref} data-reveal={variant} style={vars} {...rest}>
      {layered ? <div className="reveal-layer">{children}</div> : children}
    </Component>
  );
}

/** Applique un index de stagger (`--i`) à chaque enfant direct : les enfants se révèlent en cascade. */
export function Stagger({ children, from = 0, step = 1 }: { children: ReactNode; from?: number; step?: number }) {
  let i = from;
  return (
    <>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const el = child as ReactElement<{ index?: number; style?: CSSProperties }>;
        const idx = i;
        i += step;
        return el.type === Reveal ? cloneElement(el, { index: el.props.index ?? idx }) : cloneElement(el, { style: { ...(el.props.style ?? {}), "--i": idx } as CSSProperties });
      })}
    </>
  );
}

/** Ligne de texte masquée qui glisse vers le haut quand son parent `Reveal variant="group"` entre dans le viewport. */
export function MaskLine({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`mask-line ${className}`}>
      <span>{children}</span>
    </span>
  );
}
