"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui";

/** Fenêtre rendue au niveau du document : ne peut être coupée par une carte, un défilement ou une animation. */
export function Modal({ children, onClose, label, className }: { children: ReactNode; onClose: () => void; label: string; className?: string }) {
  const [ready, setReady] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => { setReady(true); }, []);
  useEffect(() => {
    if (!ready) return;
    const active = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const items = () => panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]');
    items()?.[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const fields = items();
        if (!fields?.length) return;
        const first = fields[0]; const last = fields[fields.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = old; window.removeEventListener("keydown", key); active?.focus(); };
  }, [ready]);
  if (!ready) return null;
  return createPortal(<div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-5" onClick={() => close.current()}><div ref={panel} role="dialog" aria-modal="true" aria-label={label} className={cn("dialog-in max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border border-border bg-card p-5 shadow-2xl sm:rounded-[24px] sm:p-6", className)} onClick={(e) => e.stopPropagation()}>{children}</div></div>, document.body);
}
