"use client";

import { useEffect, useRef } from "react";

/**
 * Barre de progression de lecture en haut de page.
 * Navigateurs modernes : 100 % CSS via `animation-timeline: scroll(root)` — aucun écouteur de défilement.
 * Repli : mise à jour par requestAnimationFrame uniquement si la fonctionnalité CSS est absente.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()")) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      el.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className="scroll-progress" aria-hidden="true" />;
}
