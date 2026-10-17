"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { buttonClass } from "@/components/ui";

/** Barre d’outils d’écran : disparaît totalement sur le document papier. */
export function PrintBar({ backHref, label = "Imprimer ou enregistrer en PDF" }: { backHref: string; label?: string }) {
  return (
    <div className="no-print sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[920px] flex-wrap items-center justify-between gap-3">
        <a href={backHref} className={buttonClass("outline", "md")}><ArrowLeft className="h-4 w-4" /> Retour</a>
        <div className="flex items-center gap-2">
          <span className="hidden text-right text-[11px] leading-4 text-muted-foreground sm:inline">Format A4 · ouvrez cette fiche en ligne une fois pour l’imprimer hors ligne</span>
          <button type="button" onClick={() => window.print()} className={buttonClass("primary", "md")}>
            <Printer className="h-4 w-4" /> {label}
          </button>
        </div>
      </div>
    </div>
  );
}
