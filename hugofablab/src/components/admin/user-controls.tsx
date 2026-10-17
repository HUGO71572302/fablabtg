"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, KeyRound, Loader2, Power, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteLabMemberAction, resetPinAction, setUserLevelAction, setUserSkillAction, toggleUserActiveAction } from "@/actions/admin";
import { Button, cn } from "@/components/ui";
import type { Level } from "@/db/schema";
import { LEVELS, LEVEL_LABEL } from "@/lib/labels";

type Machine = { id: number; name: string; requiredLevel: Level };

export function UserControls({
  user,
  machines,
  skills,
}: {
  user: { id: number; name: string; role: string; active: boolean; autonomyLevel: Level; username: string | null };
  machines: Machine[];
  skills: Record<number, Level>;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const router = useRouter();
  const locked = user.role === "fabmanager";
  const run = (fn: () => Promise<{ error?: string; success?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else toast.success(res.success);
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm">
          Niveau général
          <select
            className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
            value={user.autonomyLevel}
            disabled={pending || locked}
            onChange={(e) => run(() => setUserLevelAction(user.id, e.target.value as Level))}
          >
            {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
          </select>
        </label>
        {!locked && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  if (!confirm(`Attribuer un nouveau code PIN à ${user.name} ?`)) return;
                  const res = await resetPinAction(user.id);
                  if (res.error) toast.error(res.error);
                  else {
                    setPin(res.pin ?? null);
                    toast.success(res.success);
                  }
                })
              }
            >
              <KeyRound className="h-3.5 w-3.5" /> Nouveau PIN
            </Button>
            <Button type="button" variant={user.active ? "outline" : "success"} size="sm" disabled={pending} onClick={() => run(() => toggleUserActiveAction(user.id))} className={user.active ? "text-togo-red" : ""}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />} {user.active ? "Désactiver" : "Réactiver"}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setDeleteOpen(true)} className="text-togo-red">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </Button>
          </>
        )}
        {!locked && machines.length > 0 && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-sm font-medium text-togo-green hover:underline dark:text-emerald-300">
            Niveaux par machine <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
          </button>
        )}
      </div>
      {pin && (
        <div className="rounded-xl border border-togo-yellow/60 bg-togo-yellow/10 p-3 text-sm text-yellow-900 dark:text-yellow-100">
          Remettez ces informations à <b>{user.name}</b> : identifiant <b className="font-mono">{user.username}</b> · nouveau PIN{" "}
          <span className="select-all rounded-lg bg-card px-2 py-0.5 font-mono text-lg font-bold tracking-[0.3em] text-foreground">{pin}</span>
        </div>
      )}
      {deleteOpen && createPortal(
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) { setDeleteOpen(false); setConfirmationCode(""); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby={`delete-member-title-${user.id}`} className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={`delete-member-title-${user.id}`} className="text-lg font-extrabold">Supprimer {user.name} ?</h2>
                <div role="alert" className="mt-3 rounded-xl border border-togo-yellow/50 bg-togo-yellow/10 p-3 text-sm leading-6">
                  <p className="font-bold text-foreground">Attention : cette suppression est définitive.</p>
                  <p className="mt-1 text-muted-foreground">Le compte, ses réservations, notifications et niveaux machine seront effacés.{user.role === "student" ? " Ses notes et observations seront également supprimées." : ""}</p>
                  <p className="mt-1 text-muted-foreground">Ses projets et mouvements de stock resteront dans le lab, mais son nom n’y sera plus associé.</p>
                </div>
              </div>
              <button type="button" aria-label="Fermer" disabled={pending} onClick={() => { setDeleteOpen(false); setConfirmationCode(""); }} className="rounded-lg p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <label htmlFor={`delete-student-code-${user.id}`} className="mt-4 block text-sm font-semibold">Code de confirmation : mot de passe actuel du responsable</label>
            <input id={`delete-student-code-${user.id}`} type="password" autoComplete="current-password" value={confirmationCode} onChange={(event) => setConfirmationCode(event.target.value)} disabled={pending} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base" />
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => { setDeleteOpen(false); setConfirmationCode(""); }}>Annuler</Button>
              <Button type="button" variant="danger" disabled={pending || !confirmationCode} onClick={() => start(async () => {
                const result = await deleteLabMemberAction(user.id, confirmationCode);
                if (result.error) toast.error(result.error);
                else {
                  toast.success(result.success);
                  setDeleteOpen(false);
                  setConfirmationCode("");
                  router.refresh();
                }
              })}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Supprimer définitivement
              </Button>
            </div>
          </section>
        </div>,
        document.body,
      )}
      {open && (
        <ul className="grid gap-2 rounded-xl border border-border bg-muted/40 p-3 sm:grid-cols-2">
          {machines.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {m.name}
                <span className="block text-[13px] text-muted-foreground">requis : {LEVEL_LABEL[m.requiredLevel]}</span>
              </span>
              <select
                className="rounded-lg border border-border bg-card px-2 py-1 text-sm"
                value={skills[m.id] ?? "debutant"}
                disabled={pending}
                onChange={(e) => run(() => setUserSkillAction(user.id, m.id, e.target.value as Level))}
              >
                {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
