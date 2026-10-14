"use client";

import { useEffect, useState } from "react";
import { useInView } from "./use-in-view";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Nombre qui se compte à l'entrée dans le viewport. Rendu serveur = valeur finale (pas de saut de mise en page, SEO intact). */
export function CountUp({ value, duration = 1300, pad = 2, suffix = "", className }: { value: number; duration?: number; pad?: number; suffix?: string; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(value);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShown(0);
    setArmed(true);
  }, []);

  useEffect(() => {
    if (!armed || !inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(Math.round(easeOut(p) * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armed, inView, value, duration]);

  return (
    <span ref={ref} className={className} aria-label={`${value}${suffix}`}>
      {String(shown).padStart(pad, "0")}
      {suffix}
    </span>
  );
}
