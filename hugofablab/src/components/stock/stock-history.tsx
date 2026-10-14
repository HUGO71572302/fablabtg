"use client";

import { useActionState, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, History, Loader2, Minus, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { adjustStockAction } from "@/actions/stock";
import { Button, Input, Label, Select, cn } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { fmtDateCompact, fmtTime } from "@/lib/dates";
import { MOVEMENT_LABEL, MOVEMENT_TYPES, type MovementType, type StockItemView, type StockMovementView } from "@/lib/stock-shared";

function toneClass(type: MovementType) {
  return type === "entree" ? "text-togo-green dark:text-lime" : type === "ajustement" ? "text-amber-700 dark:text-togo-yellow" : "text-togo-red";
}

/** Journal d'un article et saisie d'un mouvement (entrée, sortie, perte) avec bénéficiaire et motif. */
export function StockHistory({
  item,
  movements,
  readOnly,
  trigger,
  onUpdate,
}: {
  item: StockItemView;
  movements: StockMovementView[];
  readOnly: boolean;
  trigger: React.ReactNode;
  onUpdate?: (quantity: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MovementType>("sortie");
  const [state, formAction, submitting] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) => {
      const res = await adjustStockAction(
        item.id,
        Number(fd.get("amount") || 0),
        String(fd.get("type")) as MovementType,
        String(fd.get("note") ?? ""),
        String(fd.get("beneficiary") ?? ""),
      );
      if (res.error) return { error: res.error };
      if (typeof res.quantity === "number") onUpdate?.(res.quantity);
      toast.success(res.success);
      return null;
    },
    null,
  );

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      {open && (
        <Modal onClose={() => setOpen(false)} label={`Journal de ${item.name}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[15px] font-bold uppercase tracking-[0.14em] text-togo-green dark:text-lime">Journal du stock</p>
              <h3 className="mt-1 text-[20px] font-extrabold tracking-tight">{item.name}</h3>
              <p className="mt-1 text-base text-muted-foreground">
                Stock actuel : <b className="font-extrabold text-foreground">{item.quantity} {item.unit}</b>
                {item.minQuantity > 0 && <> · seuil {item.minQuantity}</>}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Fermer</Button>
          </div>

          {!readOnly && (
            <form action={formAction} className="mt-5 space-y-3 rounded-[16px] border border-border bg-muted/50 p-4">
              <p className="text-[15px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Enregistrer un mouvement</p>
              <div className="grid grid-cols-2 gap-2.5">
                <Select id="movement-type" name="type" value={type} onChange={(e) => setType(e.target.value as MovementType)} aria-label="Type de mouvement">
                  {MOVEMENT_TYPES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </Select>
                <Input name="amount" type="number" min={0} step={1} defaultValue={1} required aria-label="Quantité" />
              </div>
              <div>
                <Label htmlFor="movement-beneficiary">Remis à (facultatif)</Label>
                <Input id="movement-beneficiary" name="beneficiary" placeholder="Ex. Awa Lare · Terminale D2" />
              </div>
              <div>
                <Label htmlFor="movement-note">Motif (facultatif)</Label>
                <Input id="movement-note" name="note" placeholder="Ex. Atelier 3e · robotique" />
              </div>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : type === "entree" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                Enregistrer le mouvement
              </Button>
              {state?.error && <p role="alert" className="text-base font-semibold text-togo-red">{state.error}</p>}
            </form>
          )}

          <div className="mt-6">
            <p className="mb-3 text-[15px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Mouvements récents</p>
            {movements.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-border px-4 py-6 text-center text-base text-muted-foreground">
                Aucun mouvement enregistré pour l&apos;instant.
              </p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-border pl-5">
                {movements.map((m) => (
                  <li key={m.id} className="relative">
                    <span className={cn("absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-card", m.delta > 0 ? "bg-togo-green dark:bg-lime" : m.delta < 0 ? "bg-togo-red" : "bg-togo-yellow")} />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-[16px] font-bold">
                        {MOVEMENT_LABEL[m.type]}{" "}
                        <span className={cn("tabular-nums", toneClass(m.type))}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>{" "}
                        <span className="font-medium text-muted-foreground">{item.unit}</span>
                      </p>
                      <p className="text-base font-medium text-muted-foreground">
                        {fmtDateCompact(new Date(m.createdAt))} · {fmtTime(new Date(m.createdAt))}
                      </p>
                    </div>
                    <p className="mt-1 text-base text-muted-foreground">
                      {m.userName ?? "Système"}
                      {m.beneficiary ? <> → <b className="font-bold text-foreground">{m.beneficiary}</b></> : null}
                      {m.note ? <> — {m.note}</> : null}
                    </p>
                    <a href={`/print/stock/recu/${m.id}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-base font-bold text-togo-green underline-offset-4 hover:underline dark:text-lime">
                      Imprimer le reçu
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {!readOnly && item.quantity <= item.minQuantity && (
            <p className="mt-6 flex items-start gap-2 rounded-[14px] border border-togo-yellow/50 bg-togo-yellow/10 px-4 py-3 text-base text-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-togo-yellow" />
              <span><b className="font-bold">Stock à surveiller.</b> {item.supplier ? `Fournisseur habituel : ${item.supplier}.` : "Indiquez un fournisseur sur la fiche."}</span>
            </p>
          )}
        </Modal>
      )}
    </>
  );
}

/** Boutons de mouvement rapide (−1 / +1) utilisés sur les cartes de stock. */
export function QuickMove({ item, kind, onUpdate }: { item: StockItemView; kind: "entree" | "sortie"; onUpdate?: (quantity: number) => void }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending || (kind === "sortie" && item.quantity <= 0)}
      aria-label={kind === "entree" ? `Ajouter un ${item.unit} à ${item.name}` : `Retirer un ${item.unit} de ${item.name}`}
      onClick={async () => {
        setPending(true);
        const res = await adjustStockAction(item.id, kind === "entree" ? 1 : -1, kind);
        setPending(false);
        if (res.error) toast.error(res.error);
        else {
          if (typeof res.quantity === "number") onUpdate?.(res.quantity);
          toast.success(res.success);
        }
      }}
      className={cn(
        "inline-flex h-10 min-w-10 items-center justify-center rounded-full border text-base font-bold transition",
        kind === "entree" ? "border-togo-green/35 text-togo-green hover:bg-togo-green/10 dark:text-lime" : "border-border text-foreground hover:bg-muted",
        pending && "opacity-60",
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : kind === "entree" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
    </button>
  );
}

export function HistoryButton() {
  return (
    <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-base font-bold text-muted-foreground hover:bg-muted hover:text-foreground">
      <History className="h-4 w-4" /> Journal
    </span>
  );
}
