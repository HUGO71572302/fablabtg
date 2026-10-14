"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, ExternalLink, ImageOff, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

type ImageEntry = { src: string; alt: string; group: string };
const EVENT = "hf-open-image";
const MIN = 1;
const MAX = 5;
const clamp = (v: number, min = MIN, max = MAX) => Math.max(min, Math.min(max, v));

/** Pour les images dans les formulaires, qui doivent aussi rester cliquables pour choisir un nouveau fichier. */
export function openImageViewer(src: string, alt: string, group = "preview") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<ImageEntry>(EVENT, { detail: { src, alt, group } }));
}

/** Un gestionnaire unique pour toutes les photos : aucune nouvelle dépendance ni modification des photos téléversées. */
export function ImageViewer() {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [loadError, setLoadError] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; moved: boolean; distance: number; scale: number } | null>(null);
  const lengthRef = useRef(entries.length);
  lengthRef.current = entries.length;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const hasOpen = entries.length > 0;
  const current = entries[index];

  const close = useCallback(() => {
    setEntries([]);
    setIndex(0);
    setScale(1);
    setPos({ x: 0, y: 0 });
    pointers.current.clear();
    gesture.current = null;
  }, []);

  const go = useCallback((direction: number) => {
    if (lengthRef.current <= 1) return;
    setIndex((n) => (n + direction + lengthRef.current) % lengthRef.current);
    setScale(1);
    setPos({ x: 0, y: 0 });
    setLoadError(false);
    pointers.current.clear();
    gesture.current = null;
  }, []);

  const zoomTo = useCallback((value: number) => {
    const next = clamp(value);
    setScale(next);
    if (next === 1) setPos({ x: 0, y: 0 });
  }, []);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    const eligible = (img: HTMLImageElement) => {
      if (img.closest("[data-no-zoom], header, nav, [role='dialog']")) return false;
      const src = img.currentSrc || img.src;
      if (!src || /\/icons\/|\/favicon\./.test(src)) return false;
      return img.hasAttribute("data-zoomable") || Boolean(img.getAttribute("alt")?.trim());
    };
    const images = () => [...document.querySelectorAll<HTMLImageElement>("img")].filter(eligible);
    const prepare = () => {
      for (const img of images()) {
        if (img.dataset.viewerReady === "1") continue;
        img.dataset.viewerReady = "1";
        img.tabIndex = 0;
        img.setAttribute("role", "button");
        img.setAttribute("aria-label", `Agrandir l’image : ${img.alt || "Photo"}`);
        img.setAttribute("title", "Cliquer pour voir en plein écran");
      }
    };
    prepare();
    let raf = 0;
    const observer = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; prepare(); });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const launch = (img: HTMLImageElement) => {
      const group = img.dataset.gallery || img.closest<HTMLElement>("[data-gallery]")?.dataset.gallery || "page";
      const all = images().filter((other) =>
        (other.dataset.gallery || other.closest<HTMLElement>("[data-gallery]")?.dataset.gallery || "page") === group,
      );
      const list = all.map((other) => ({ src: other.currentSrc || other.src, alt: other.alt || "Photo du FabLab", group }));
      const n = all.indexOf(img);
      if (n < 0) return;
      previousFocus.current = img;
      setEntries(list);
      setIndex(n);
      setScale(1);
      setPos({ x: 0, y: 0 });
      setLoadError(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof HTMLImageElement) || !eligible(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      launch(e.target);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.target instanceof HTMLImageElement) || !eligible(e.target) || !["Enter", " "].includes(e.key)) return;
      e.preventDefault();
      launch(e.target);
    };
    const onExternal = (e: Event) => {
      const { src, alt, group } = (e as CustomEvent<ImageEntry>).detail;
      if (!src) return;
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setEntries([{ src, alt: alt || "Photo du FabLab", group: group || "preview" }]);
      setIndex(0);
      setScale(1);
      setPos({ x: 0, y: 0 });
      setLoadError(false);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener(EVENT, onExternal);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener(EVENT, onExternal);
    };
  }, [ready]);

  useEffect(() => {
    if (!hasOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomTo(scale + 0.5); }
      else if (e.key === "-") { e.preventDefault(); zoomTo(scale - 0.5); }
      else if (e.key === "0") { e.preventDefault(); zoomTo(1); }
      else if (e.key === "Tab") {
        const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]');
        if (!controls?.length) return;
        const first = controls[0]; const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKey);
      previousFocus.current?.focus();
    };
  }, [hasOpen, close, go, zoomTo]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Les flèches sont dans la scène : ne jamais capturer leurs événements (sinon le click est perdu).
    if (e.target instanceof Element && e.target.closest("button, a")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = { x: e.clientX, y: e.clientY, moved: false, distance: 0, scale };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { x: e.clientX, y: e.clientY, moved: true, distance: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const before = pointers.current.get(e.pointerId);
    if (!before) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      if (gesture.current.distance > 0) zoomTo(gesture.current.scale * Math.hypot(a.x - b.x, a.y - b.y) / gesture.current.distance);
    } else if (scale > 1) {
      setPos((p) => ({ x: p.x + e.clientX - before.x, y: p.y + e.clientY - before.y }));
      if (gesture.current) gesture.current.moved = true;
    }
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      const start = gesture.current;
      if (start && scale === 1 && !start.moved && Math.abs(e.clientX - start.x) > 65 && entries.length > 1) go(e.clientX < start.x ? 1 : -1);
      gesture.current = null;
    }
  };
  // React attache `wheel` en mode passif ; pour zoomer sans défilement ni avertissement navigateur,
  // l'écouteur natif est attaché uniquement tant que la visionneuse est ouverte.
  useEffect(() => {
    if (!hasOpen || !stage.current) return;
    const el = stage.current;
    const wheel = (e: WheelEvent) => {
      if (!e.deltaY) return;
      e.preventDefault();
      zoomTo(scaleRef.current + (e.deltaY < 0 ? 0.25 : -0.25));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [hasOpen, zoomTo]);

  if (!ready || !hasOpen || !current) return null;
  const controls = "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/25 disabled:opacity-35 sm:h-11 sm:w-11";
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={`Visionneuse : ${current.alt}`}
      className="fixed inset-0 z-[100] flex flex-col bg-[#070d0a]/97 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-5"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="flex min-h-[48px] items-center gap-2 sm:gap-4">
        <p className="min-w-0 flex-1 truncate text-[13px] font-bold sm:text-base" id="viewer-caption">{current.alt}</p>
        <span className="shrink-0 font-mono text-[12px] text-white/65" aria-live="polite">{index + 1} / {entries.length}</span>
        <a href={current.src} download title="Télécharger l’image" aria-label="Télécharger l’image" className={controls}><Download className="h-4 w-4" /></a>
        <a href={current.src} target="_blank" rel="noreferrer" title="Ouvrir l'image dans un onglet" aria-label="Ouvrir l'image dans un onglet" className={controls}><ExternalLink className="h-4 w-4" /></a>
        <button ref={closeBtn} type="button" onClick={close} aria-label="Fermer la visionneuse" title="Fermer (Échap)" className={controls}><X className="h-5 w-5" /></button>
      </div>
      <div ref={stage} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[20px] bg-white/[0.035] touch-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onDoubleClick={(e) => { if (e.target === e.currentTarget) zoomTo(scale === 1 ? 2.5 : 1); }}>
        {loadError ? <div className="flex flex-col items-center gap-3 text-center text-white/75"><ImageOff className="h-12 w-12" /><p>Impossible de charger cette image.</p><a href={current.src} target="_blank" rel="noreferrer" className="text-sm font-bold text-lime underline">L’ouvrir dans un nouvel onglet</a></div> : <img key={current.src} src={current.src} alt={current.alt} draggable={false} onError={() => setLoadError(true)} className="pointer-events-none max-h-full max-w-full select-none object-contain will-change-transform" style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})` }} />}
        {entries.length > 1 && <><button type="button" className={`${controls} absolute left-2 top-1/2 -translate-y-1/2 sm:left-4`} onClick={() => go(-1)} aria-label="Image précédente" title="Précédente (←)"><ChevronLeft className="h-5 w-5" /></button><button type="button" className={`${controls} absolute right-2 top-1/2 -translate-y-1/2 sm:right-4`} onClick={() => go(1)} aria-label="Image suivante" title="Suivante (→)"><ChevronRight className="h-5 w-5" /></button></>}
      </div>
      <div className="flex min-h-[62px] items-center justify-between gap-2 py-2">
        <p className="hidden text-[11px] text-white/55 sm:block">Double-clic ou molette pour zoomer · Faites glisser pour déplacer · Échap pour fermer</p>
        <p className="text-[11px] text-white/55 sm:hidden">Pincez pour zoomer · Glissez pour naviguer</p>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className={controls} disabled={scale <= 1} onClick={() => zoomTo(scale - 0.5)} aria-label="Réduire l’image"><ZoomOut className="h-4 w-4" /></button>
          <span className="w-11 text-center font-mono text-[12px] tabular-nums" aria-live="polite">{Math.round(scale * 100)}%</span>
          <button type="button" className={controls} disabled={scale >= MAX} onClick={() => zoomTo(scale + 0.5)} aria-label="Agrandir l’image"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" className={controls} disabled={scale === 1} onClick={() => zoomTo(1)} aria-label="Réinitialiser le zoom"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
