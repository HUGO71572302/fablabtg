"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type Callback = (entry: IntersectionObserverEntry) => void;

/**
 * Un seul IntersectionObserver pour toute la page : chaque élément s'enregistre avec son callback.
 * Beaucoup plus léger qu'un observer par composant quand une page contient 60+ éléments animés.
 */
let observer: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, Callback>();

function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => callbacks.get(entry.target)?.(entry)),
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );
  return observer;
}

export function observe(el: Element, cb: Callback) {
  callbacks.set(el, cb);
  getObserver().observe(el);
  return () => {
    callbacks.delete(el);
    observer?.unobserve(el);
  };
}

/** Vrai dès que l'élément entre dans le viewport (une seule fois par défaut). */
export function useInView<T extends Element>(once = true): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    return observe(el, (entry) => {
      if (entry.isIntersecting) {
        setInView(true);
        if (once) observer?.unobserve(el);
      } else if (!once) setInView(false);
    });
  }, [once]);
  return [ref, inView];
}
