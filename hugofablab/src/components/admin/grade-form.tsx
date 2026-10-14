"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteGradeAction, saveGradeAction } from "@/actions/pedagogy";
import { Alert } from "@/components/auth/auth-forms";
import { Button, Input, Label, Select, Textarea, cn } from "@/components/ui";
import { dayKey } from "@/lib/dates";
import { GRADE_KINDS, type GradeKind, type GradeView } from "@/lib/pedagogy-shared";

/** Saisie d'une note ou d'une observation pour un apprenant. */
export function GradeForm({ learnerId }: { learnerId: number }) {
  const [state, action, pending] = useActionState(saveGradeAction, null);
  const [kind, setKind] = useState<GradeKind>("note");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.success);
      setFormKey((k) => k + 1);
    } else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form key={formKey} action={action} className="space-y-4">
      <input type="hidden" name="userId" value={learnerId} />
      {state?.error && <Alert state={state} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="grade-label">Intitulé</Label>
          <Input id="grade-label" name="label" required minLength={2} placeholder="ex. Évaluation découpe laser" />
        </div>
        <div>
          <Label htmlFor="grade-kind">Type</Label>
          <Select id="grade-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as GradeKind)}>
            {GRADE_KINDS.map((k) => (
              <option key={k.id} value={k.id}>{k.title}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {kind === "note" ? (
          <div>
            <Label htmlFor="grade-score">Note obtenue</Label>
            <Input id="grade-score" name="score" type="number" min={0} step={0.5} inputMode="decimal" placeholder="15" required />
          </div>
        ) : (
          <input type="hidden" name="score" value="" />
        )}
        <div>
          <Label htmlFor="grade-max">Barème</Label>
          <Input id="grade-max" name="maxScore" type="number" min={1} max={200} step={1} defaultValue={20} />
        </div>
        <div>
          <Label htmlFor="grade-date">Date de l'évaluation</Label>
          <Input id="grade-date" name="gradedAt" type="date" defaultValue={dayKey(new Date())} required />
        </div>
      </div>
      <div>
        <Label htmlFor="grade-comment">{kind === "note" ? "Appréciation (facultatif)" : "Observation"}</Label>
        <Textarea id="grade-comment" name="comment" className="min-h-[76px]" placeholder={kind === "note" ? "ex. Bon réglage des paramètres, continue." : "ex. Aide ses camarades sur la machine n° 2."} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Enregistrer dans le suivi
      </Button>
    </form>
  );
}

/** Suppression d'une ligne du suivi, avec confirmation. */
export function DeleteGradeButton({ id }: { id: number }) {
  const [pending, start] = useTransitionSafe();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Supprimer cette évaluation ?")) return;
        start(async () => {
          const res = await deleteGradeAction(id);
          if (res.error) toast.error(res.error);
          else toast.success(res.success);
        });
      }}
      aria-label="Supprimer cette évaluation"
      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-togo-red/10 hover:text-togo-red"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}

/** Petit helper (état de transition) isolé pour garder le fichier lisible. */
function useTransitionSafe(): [boolean, (fn: () => Promise<void>) => void] {
  const [pending, setPending] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setPending(true);
    try { await fn(); } finally { setPending(false); }
  };
  return [pending, run];
}

/** Ligne d'évaluation affichée dans les fiches. */
export function GradeRow({ g, onDelete }: { g: GradeView; onDelete?: boolean }) {
  const isNote = g.kind === "note" && g.score != null;
  return (
    <tr className="border-b border-border/70">
      <td className="whitespace-nowrap py-3 pr-3 font-medium">{new Date(g.gradedAt).toLocaleDateString("fr-FR")}</td>
      <td className="py-3 pr-3">
        <p className="font-bold">{g.label}</p>
        {g.comment && <p className="text-[13px] text-muted-foreground">{g.comment}</p>}
      </td>
      <td className="whitespace-nowrap py-3 pr-3">
        {isNote ? (
          <span className={cn("font-display text-lg font-extrabold tabular-nums", Number(g.score) * 20 / g.maxScore >= 10 ? "text-togo-green dark:text-lime" : "text-togo-red")}>
            {g.score}<span className="text-[13px] font-bold text-muted-foreground">/{g.maxScore}</span>
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-1 text-[12px] font-bold text-muted-foreground">Observation</span>
        )}
      </td>
      <td className="py-3 text-right text-[13px] text-muted-foreground">{g.author ?? "—"}</td>
      {onDelete && <td className="py-3 pl-2 text-right"><DeleteGradeButton id={g.id} /></td>}
    </tr>
  );
}
