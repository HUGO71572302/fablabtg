"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Check, Loader2, MapPinCheck, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { adminSetStatusAction, adminUpdateReservationAction, checkInAction } from "@/actions/reservations";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import type { ReservationStatus } from "@/db/schema";
import { durationLabel, minutesToTime, timeToMinutes } from "@/lib/dates";

export type AdminResourceOption = { id: number; name: string; type: string; maxDurationMinutes: number };

export function ReservationAdminActions({
  reservation,
  resources,
  settings,
}: {
  reservation: {
    id: number;
    status: ReservationStatus;
    resourceId: number;
    date: string;
    start: string;
    duration: number;
    note: string | null;
    checkedIn: boolean;
    isPast: boolean;
  };
  resources: AdminResourceOption[];
  settings: { openTime: string; closeTime: string; slotStepMinutes: number };
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [state, formAction, saving] = useActionState(adminUpdateReservationAction, null);
  const [resourceId, setResourceId] = useState(reservation.resourceId);
  const [duration, setDuration] = useState(reservation.duration);

  useEffect(() => {
    if (state?.success) {
      toast.success("Réservation modifiée", { description: state.success });
      setEditing(false);
    } else if (state?.error) toast.error(state.error);
  }, [state]);

  const step = settings.slotStepMinutes;
  const startOptions = useMemo(() => {
    const out: string[] = [];
    for (let m = timeToMinutes(settings.openTime); m + step <= timeToMinutes(settings.closeTime); m += step) out.push(minutesToTime(m));
    if (!out.includes(reservation.start)) out.unshift(reservation.start);
    return out;
  }, [settings.openTime, settings.closeTime, step, reservation.start]);
  const maxDur = resources.find((r) => r.id === resourceId)?.maxDurationMinutes ?? 240;
  const durationOptions = useMemo(() => {
    const out: number[] = [];
    for (let d = step; d <= Math.max(maxDur, duration); d += step) out.push(d);
    return out;
  }, [step, maxDur, duration]);

  const run = (fn: () => Promise<{ error?: string; success?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else toast.success(res.success);
    });

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap gap-2">
        {reservation.status === "en_attente" && (
          <Button type="button" variant="success" size="sm" disabled={pending} onClick={() => run(() => adminSetStatusAction(reservation.id, "confirmee"))}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirmer
          </Button>
        )}
        {reservation.status === "annulee" && (
          <Button type="button" variant="success" size="sm" disabled={pending} onClick={() => run(() => adminSetStatusAction(reservation.id, "confirmee"))}>
            <Check className="h-4 w-4" /> Rétablir & confirmer
          </Button>
        )}
        {reservation.status !== "annulee" && (
          <Button type="button" variant="outline" size="sm" className="text-togo-red" disabled={pending} onClick={() => setCancelling((v) => !v)}>
            <X className="h-4 w-4" /> Annuler
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
          <Pencil className="h-4 w-4" /> Modifier
        </Button>
        {reservation.status === "confirmee" && !reservation.checkedIn && (
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => run(() => checkInAction(reservation.id))}>
            <MapPinCheck className="h-4 w-4" /> Pointer présence
          </Button>
        )}
      </div>

      {cancelling && (
        <div className="rounded-xl border border-togo-red/40 bg-togo-red/5 p-3">
          <Label htmlFor={`reason-${reservation.id}`}>Motif (transmis à l'utilisateur)</Label>
          <Textarea id={`reason-${reservation.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. Machine en panne, créneau réattribué…" className="min-h-[64px]" />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => {
                run(() => adminSetStatusAction(reservation.id, "annulee", reason));
                setCancelling(false);
              }}
            >
              Confirmer l'annulation
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCancelling(false)}>Retour</Button>
          </div>
        </div>
      )}

      {editing && (
        <form action={formAction} className="grid gap-3 rounded-xl border border-border bg-muted/40 p-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={reservation.id} />
          <div className="sm:col-span-2">
            <Label>Ressource</Label>
            <Select name="resourceId" value={resourceId} onChange={(e) => setResourceId(Number(e.target.value))}>
              <optgroup label="Machines">
                {resources.filter((r) => r.type === "machine").map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </optgroup>
              <optgroup label="Salles">
                {resources.filter((r) => r.type === "salle").map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </optgroup>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" name="date" defaultValue={reservation.date} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Début</Label>
              <Select name="start" defaultValue={reservation.start}>
                {startOptions.map((s) => <option key={s} value={s}>{s.replace(":", "h")}</option>)}
              </Select>
            </div>
            <div>
              <Label>Durée</Label>
              <Select name="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {durationOptions.map((d) => <option key={d} value={d}>{durationLabel(d)}</option>)}
              </Select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Note pour l'utilisateur</Label>
            <Input name="note" defaultValue={reservation.note ?? ""} placeholder="Ex. Déplacée sur l'imprimante #1, plateau plus grand." />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Enregistrer & notifier
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Annuler</Button>
          </div>
        </form>
      )}
    </div>
  );
}
