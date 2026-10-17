"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, LogIn, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonClass } from "@/components/ui";
import { SITE } from "@/config/site";

export function PublicHeader({ appHref, nav = SITE.nav as unknown as { href: string; label: string }[], joinHref = "/register", joinLabel = "Rejoindre un lab" }: {
  appHref?: string | null;
  nav?: { href: string; label: string }[];
  joinHref?: string;
  joinLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); menuRef.current?.focus(); }
      if (e.key === "Tab") {
        const fields = panelRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)');
        if (!fields?.length) return;
        const first = fields[0]; const last = fields[fields.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = old; window.removeEventListener("keydown", close); };
  }, [open]);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="site-container flex h-[78px] items-center justify-between gap-3 sm:h-[88px]">
          <Link href="/" aria-label="HUGO FABLAB, accueil"><Logo /></Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigation principale">
            {nav.map((n) => <Link key={n.href} href={n.href} className="text-[15px] font-medium text-muted-foreground transition hover:text-togo-green dark:hover:text-lime">{n.label}</Link>)}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block"><ThemeToggle /></div>
            <Link href={appHref ?? "/login"} className="hidden text-[15px] font-semibold transition hover:text-togo-green dark:hover:text-lime sm:block">{appHref ? "Mon espace" : "Connexion"}</Link>
            <Link href={appHref ?? joinHref} className={buttonClass("primary", "md", "hidden md:inline-flex text-[15px]")}>
              {appHref ? "Ouvrir mon lab" : joinLabel}<ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href={appHref ?? "/login"} className="icon-button sm:hidden" aria-label={appHref ? "Mon espace" : "Connexion"}><LogIn className="h-4 w-4" /></Link>
            <button ref={menuRef} type="button" className="icon-button lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" aria-expanded={open} aria-controls="public-mobile-menu"><Menu className="h-4.5 w-4.5" /></button>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
          <div ref={panelRef} id="public-mobile-menu" role="dialog" aria-modal="true" aria-label="Menu de navigation" className="dialog-in absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto overscroll-contain bg-background p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><Logo /><button ref={closeRef} type="button" className="icon-button" onClick={() => { setOpen(false); menuRef.current?.focus(); }} aria-label="Fermer le menu"><X className="h-5 w-5" /></button></div>
            <p className="eyebrow mt-12 text-muted-foreground">Explorer</p>
            <nav className="mt-4 divide-y divide-border" aria-label="Menu mobile">
              {nav.map((n) => <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="flex items-center justify-between py-5 font-display text-xl font-bold">{n.label}<ArrowUpRight className="h-5 w-5 text-muted-foreground" /></Link>)}
            </nav>
            <div className="mt-8 space-y-3">
              <Link href={appHref ?? joinHref} onClick={() => setOpen(false)} className={buttonClass("primary", "lg", "w-full")}>{appHref ? "Mon espace" : joinLabel}<ArrowUpRight className="h-4 w-4" /></Link>
              <Link href="/creer-mon-lab" onClick={() => setOpen(false)} className={buttonClass("outline", "lg", "w-full")}>Créer le lab de mon école</Link>
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-border pt-5"><span className="text-sm text-muted-foreground">Clair ou sombre, à vous de choisir.</span><ThemeToggle /></div>
          </div>
        </div>
      )}
    </>
  );
}
