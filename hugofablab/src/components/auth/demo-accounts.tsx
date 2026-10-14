"use client";

import { useState } from "react";
import { ChevronDown, Eye, EyeOff, KeyRound } from "lucide-react";
import { cn } from "@/components/ui";

const ACCOUNTS = [
  { role: "Élève de Terminale", id: "awa.lare", pin: "1234" },
  { role: "Élève de Première", id: "afi.bassabi", pin: "1234" },
  { role: "Élève de 3e", id: "kossi.tchamie", pin: "1234" },
];

/** Comptes élèves de démonstration, masqués par défaut. Le compte responsable n'est jamais affiché. */
export function DemoAccounts() {
  const [open, setOpen] = useState(false);
  const [reveal, setReveal] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/50 text-sm text-muted-foreground">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-medium text-foreground" aria-expanded={open}>
        <span className="inline-flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5 text-togo-green dark:text-emerald-300" /> Comptes élèves de démonstration
        </span>
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          <ul className="space-y-1.5">
            {ACCOUNTS.map((a) => (
              <li key={a.id}>
                <b className="text-foreground">{a.role}</b> · identifiant <code className="select-all">{a.id}</code> · PIN{" "}
                <code className="select-all font-mono">{reveal ? a.pin : "••••"}</code>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setReveal((v) => !v)} className="inline-flex items-center gap-1 text-togo-green underline-offset-2 hover:underline dark:text-emerald-300">
            {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {reveal ? "Masquer les codes" : "Afficher les codes"}
          </button>
        </div>
      )}
    </div>
  );
}
