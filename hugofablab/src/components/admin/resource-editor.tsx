"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteResourceAction, saveResourceAction, setResourceStatusAction } from "@/actions/admin";
import { ImageInput } from "@/components/ui/image-input";
import { Modal } from "@/components/ui/modal";
import { Button, Input, Label, Select, Textarea, cn } from "@/components/ui";
import type { Level, ResourceStatus } from "@/db/schema";
import { ICON_OPTIONS, LEVELS, LEVEL_LABEL, RESOURCE_STATUS_LABEL } from "@/lib/labels";
import type { ActionState } from "@/actions/auth";

export type EditableResource = {
  id: number;
  type: "salle" | "machine";
  name: string;
  category: string;
  description: string | null;
  status: ResourceStatus;
  requiredLevel: Level;
  capacity: number;
  maxDurationMinutes: number;
  roomId: number | null;
  icon: string;
  photoUrl?: string | null;
};

export function ResourceEditor({ initial, rooms, trigger }: { initial?: EditableResource; rooms: { id: number; name: string }[]; trigger?: "button" | "icon" }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"salle" | "machine">(initial?.type ?? "machine");
  const submitAction = async (previous: ActionState, fd: FormData): Promise<ActionState> => {
    const result = await saveResourceAction(previous, fd);
    if (result?.success) setOpen(false);
    return result;
  };
  const [state, action, pending] = useActionState(submitAction, null);
  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
    } else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <>
      {trigger === "icon" ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" /> Modifier
        </Button>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nouvelle ressource
        </Button>
      )}
      {open && (
        <Modal onClose={() => setOpen(false)} label={initial ? "Modifier une ressource" : "Nouvelle ressource"}>
          <form
            action={action}
            onClick={(e) => e.stopPropagation()}
            className="w-full"
          >
            <h3 className="text-xl font-bold">{initial ? `Modifier « ${initial.name} »` : "Nouvelle ressource"}</h3>
            {initial && <input type="hidden" name="id" value={initial.id} />}
            <div className="mt-4 grid gap-3">
              <div>
                <Label>Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["machine", "salle"] as const).map((t) => (
                    <label key={t} className={cn("cursor-pointer rounded-xl border px-3 py-2 text-center text-base font-medium capitalize", type === t ? "border-togo-green bg-togo-green/10" : "border-border")}>
                      <input type="radio" name="type" value={t} className="sr-only" checked={type === t} onChange={() => setType(t)} />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Nom</Label>
                <Input name="name" defaultValue={initial?.name} required placeholder={type === "salle" ? "Ex. Salle Fabrication" : "Ex. Imprimante 3D #3"} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Catégorie</Label>
                  <Input name="category" defaultValue={initial?.category ?? (type === "salle" ? "Salle" : "")} placeholder="Impression 3D, Découpe laser…" />
                </div>
                <div>
                  <Label>Icône</Label>
                  <Select name="icon" defaultValue={initial?.icon ?? (type === "salle" ? "room" : "printer")}>
                    {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea name="description" defaultValue={initial?.description ?? ""} className="min-h-[64px]" />
              </div>
              <ImageInput name="photo" label="Photo de la machine / salle" current={initial?.photoUrl ?? null} hint="Prenez en photo votre vraie machine (JPG/PNG, 10 Mo max)." />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{type === "salle" ? "Places" : "Postes simultanés"}</Label>
                  <Input type="number" name="capacity" min={1} defaultValue={initial?.capacity ?? 1} />
                </div>
                <div>
                  <Label>Durée max (min)</Label>
                  <Input type="number" name="maxDurationMinutes" min={15} step={15} defaultValue={initial?.maxDurationMinutes ?? 120} />
                </div>
              </div>
              {type === "machine" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Niveau requis</Label>
                    <Select name="requiredLevel" defaultValue={initial?.requiredLevel ?? "debutant"}>
                      {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>Salle</Label>
                    <Select name="roomId" defaultValue={initial?.roomId ?? 0}>
                      <option value={0}>— Aucune —</option>
                      {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Fermer</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function ResourceStatusButtons({ id, name, type, status }: { id: number; name: string; type: "salle" | "machine"; status: ResourceStatus }) {
  const [pending, start] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const router = useRouter();
  const set = (s: ResourceStatus) =>
    start(async () => {
      const res = await setResourceStatusAction(id, s);
      if (res.error) toast.error(res.error);
      else toast.success(res.success);
    });
  const remove = () => {
    start(async () => {
      const res = await deleteResourceAction(id, confirmationCode);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.success);
        setDeleteOpen(false);
        setConfirmationCode("");
        router.refresh();
      }
    });
  };
  return (
    <div className="flex flex-wrap gap-1">
      {(["disponible", "maintenance", "desactivee"] as ResourceStatus[]).map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending || status === s}
          onClick={() => set(s)}
          className={cn(
            "min-h-9 rounded-full border px-2.5 py-1.5 text-[13px] font-medium transition disabled:cursor-default",
            status === s
              ? s === "disponible"
                ? "border-togo-green bg-togo-green text-white"
                : s === "maintenance"
                  ? "border-yellow-500 bg-togo-yellow text-black"
                  : "border-border bg-muted text-muted-foreground"
              : "border-border hover:bg-muted",
          )}
        >
          {RESOURCE_STATUS_LABEL[s]}
        </button>
      ))}
      <>
        <button
          type="button"
          disabled={pending}
          onClick={() => setDeleteOpen(true)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-togo-red/30 px-3 py-1.5 text-[13px] font-semibold text-togo-red transition hover:bg-togo-red/10 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer
        </button>
        {deleteOpen && (
          <Modal onClose={() => { if (!pending) { setDeleteOpen(false); setConfirmationCode(""); } }} label={`Confirmer la suppression de ${type === "salle" ? "la salle" : "la machine"} ${name}`} className="max-w-lg">
            <h2 className="text-xl font-extrabold">Supprimer {type === "salle" ? "la salle" : "la machine"} « {name} » ?</h2>
            <div role="alert" className="mt-4 rounded-xl border border-togo-yellow/50 bg-togo-yellow/10 p-3 text-sm leading-6">
              <p className="font-bold text-foreground">Attention : cette suppression est définitive.</p>
              {type === "machine" ? (
                <p className="mt-1 text-muted-foreground">Les réservations, listes d’attente, niveaux machine et fermetures associés seront supprimés.</p>
              ) : (
                <>
                  <p className="mt-1 text-muted-foreground">Les réservations, listes d’attente et fermetures associées à cette salle seront supprimées.</p>
                  <p className="mt-1 text-muted-foreground">Les machines de cette salle resteront dans le lab, sans salle associée.</p>
                </>
              )}
            </div>
            <label htmlFor={`delete-resource-code-${id}`} className="mt-4 block text-sm font-semibold">Code de confirmation : mot de passe actuel du responsable</label>
            <input id={`delete-resource-code-${id}`} type="password" autoComplete="current-password" value={confirmationCode} onChange={(event) => setConfirmationCode(event.target.value)} disabled={pending} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base" />
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => { setDeleteOpen(false); setConfirmationCode(""); }}>Annuler</Button>
              <Button type="button" variant="danger" disabled={pending || !confirmationCode} onClick={remove}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Supprimer définitivement
              </Button>
            </div>
          </Modal>
        )}
      </>
    </div>
  );
}
