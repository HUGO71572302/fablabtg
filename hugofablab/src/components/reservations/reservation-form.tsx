"use client";

import { startTransition, useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, Expand, ListPlus, Loader2, Lock, DoorOpen, Wrench, XCircle } from "lucide-react";
import { openImageViewer } from "@/components/system/image-viewer";
import { toast } from "sonner";
import { checkSlotAction, createReservationAction, joinWaitlistAction, type ReserveState } from "@/actions/reservations";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { Button, Input, Label, LevelBadge, Select, Textarea, cn } from "@/components/ui";
import type { Level, ResourceStatus } from "@/db/schema";
import { durationLabel, minutesToTime, timeToMinutes } from "@/lib/dates";
import { LEVEL_LABEL, RESOURCE_STATUS_LABEL } from "@/lib/labels";
import type { SlotCheck } from "@/lib/reservations";

export type FormResource = {
  id: number;
  name: string;
  type: "salle" | "machine";
  category: string;
  status: ResourceStatus;
  requiredLevel: Level;
  capacity: number;
  maxDurationMinutes: number;
  roomName: string | null;
  userLevel: Level;
  allowed: boolean;
  photoUrl?: string | null;
  icon?: string;
};

export function ReservationForm({
  resources,
  settings,
  defaultResourceId,
  today,
  isAdmin,
}: {
  resources: FormResource[];
  settings: { openTime: string; closeTime: string; slotStepMinutes: number; maxDurationMinutes: number; openDays: number[] };
  defaultResourceId?: number;
  today: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const preselected = resources.find((r) => r.id === defaultResourceId);
  const [type, setType] = useState<"machine" | "salle">(preselected?.type ?? "machine");
  const list = useMemo(() => resources.filter((r) => r.type === type), [resources, type]);
  const [resourceId, setResourceId] = useState<number>(preselected?.id ?? list[0]?.id ?? 0);
  const [date, setDate] = useState(today);
  const [start, setStart] = useState(settings.openTime);
  const [duration, setDuration] = useState(60);
  const [purpose, setPurpose] = useState("");
  const [check, setCheck] = useState<SlotCheck | null>(null);
  const [checking, startChecking] = useTransition();
  const [state, formAction, pending] = useActionState(createReservationAction, null);
  const [wlState, wlAction, wlPending] = useActionState(joinWaitlistAction, null);

  const resource = resources.find((r) => r.id === resourceId) ?? null;
  const openMin = timeToMinutes(settings.openTime);
  const closeMin = timeToMinutes(settings.closeTime);
  const step = settings.slotStepMinutes;
  const maxDur = resource ? (isAdmin ? resource.maxDurationMinutes : Math.min(resource.maxDurationMinutes, settings.maxDurationMinutes)) : settings.maxDurationMinutes;

  const startOptions = useMemo(() => {
    const out: string[] = [];
    for (let m = openMin; m + step <= closeMin; m += step) out.push(minutesToTime(m));
    return out;
  }, [openMin, closeMin, step]);
  const durationOptions = useMemo(() => {
    const out: number[] = [];
    for (let d = step; d <= maxDur; d += step) out.push(d);
    if (!out.length) out.push(maxDur);
    return out;
  }, [step, maxDur]);

  useEffect(() => {
    if (!list.some((r) => r.id === resourceId)) setResourceId(list[0]?.id ?? 0);
  }, [list, resourceId]);
  useEffect(() => {
    if (duration > maxDur) setDuration(durationOptions[durationOptions.length - 1] ?? step);
  }, [maxDur, duration, durationOptions, step]);

  useEffect(() => {
    if (!resourceId || !date || !start || !duration) return;
    const t = setTimeout(() => {
      startChecking(async () => {
        const res = await checkSlotAction({ resourceId, date, start, duration });
        setCheck(res);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [resourceId, date, start, duration]);

  useEffect(() => {
    if (state?.success) {
      toast.success("Demande envoyée !", { description: state.success });
      router.push("/app/reservations");
    }
  }, [state, router]);
  useEffect(() => {
    if (wlState?.success) {
      toast.success("Liste d'attente", { description: wlState.success });
      router.push("/app/reservations?tab=attente");
    }
  }, [wlState, router]);

  const endLabel = minutesToTime(timeToMinutes(start) + duration);
  const dayOfWeek = date ? new Date(`${date}T00:00:00Z`).getUTCDay() : null;
  const closedDay = dayOfWeek !== null && !settings.openDays.includes(dayOfWeek);
  const showFull = Boolean(check?.full || state?.full);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="start" value={start} />
      <input type="hidden" name="duration" value={duration} />
      <input type="hidden" name="purpose" value={purpose} />

      {/* Type */}
      <div>
        <Label>Que souhaitez-vous réserver ?</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["machine", "salle"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-base font-semibold",
                type === t ? "border-togo-green bg-togo-green/10 text-togo-green dark:text-emerald-300" : "border-border bg-card",
              )}
            >
              {t === "machine" ? <><Wrench className="h-4 w-4" />Une machine</> : <><DoorOpen className="h-4 w-4" />Une salle</>}
            </button>
          ))}
        </div>
      </div>

      {/* Ressource */}
      <div>
        <Label>{type === "machine" ? "Machine" : "Salle"}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((r) => {
            const disabled = r.status !== "disponible" && !isAdmin;
            const locked = !r.allowed && !isAdmin;
            const active = r.id === resourceId;
            return (
              <div key={r.id} className="relative">
                <button
                  type="button"
                  onClick={() => setResourceId(r.id)}
                  aria-pressed={active}
                  className={cn(
                    "relative h-full w-full rounded-xl border p-3 text-left transition",
                    active ? "border-togo-green bg-togo-green/10" : "border-border bg-card hover:bg-muted",
                    (disabled || locked) && "opacity-70",
                  )}
                >
                  <div className="mb-2 flex items-center gap-2.5 pr-8">
                    {r.photoUrl ? <img src={r.photoUrl} alt="" data-no-zoom className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-togo-green dark:text-lime"><ResourceIcon icon={r.icon ?? "wrench"} className="h-4 w-4" /></span>}
                    <p className="min-w-0 flex-1 text-[15px] font-semibold">{r.name}</p>
                    {locked ? <Lock className="h-4 w-4 text-togo-red" /> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {r.category}
                    {r.roomName ? ` · ${r.roomName}` : ""} · {r.capacity > 1 ? `${r.capacity} places` : "1 poste"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <LevelBadge level={r.requiredLevel} />
                    {r.status !== "disponible" && (
                      <span className="rounded-full bg-togo-red/10 px-2 py-0.5 text-[13px] font-medium text-togo-red">{RESOURCE_STATUS_LABEL[r.status]}</span>
                    )}
                    {locked && <span className="text-[13px] text-togo-red">Votre niveau : {LEVEL_LABEL[r.userLevel]}</span>}
                  </div>
                </button>
                {r.photoUrl && (
                  <button
                    type="button"
                    onClick={() => openImageViewer(r.photoUrl!, r.name, type)}
                    aria-label={`Agrandir la photo de ${r.name}`}
                    title="Voir la machine ou la salle en plein écran"
                    className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-togo-green shadow-sm hover:bg-muted dark:text-lime"
                  >
                    <Expand className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
          {!list.length && <p className="text-base text-muted-foreground">Aucune ressource disponible.</p>}
        </div>
      </div>

      {/* Créneau */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
          {closedDay && <p className="mt-1 text-sm text-togo-red">Le FabLab est fermé ce jour.</p>}
        </div>
        <div>
          <Label htmlFor="start">Heure de début</Label>
          <Select id="start" value={start} onChange={(e) => setStart(e.target.value)}>
            {startOptions.map((s) => (
              <option key={s} value={s}>{s.replace(":", "h")}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="duration">Durée</Label>
          <Select id="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {durationOptions.map((d) => (
              <option key={d} value={d}>{durationLabel(d)}</option>
            ))}
          </Select>
          <p className="mt-1 text-sm text-muted-foreground">Fin prévue : {endLabel.replace(":", "h")} · max {durationLabel(maxDur)}</p>
        </div>
      </div>

      {/* Disponibilité */}
      <div
        className={cn(
          "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-base",
          !check || checking
            ? "border-border bg-muted/40 text-muted-foreground"
            : check.ok
              ? "border-togo-green/40 bg-togo-green/10 text-togo-green dark:text-emerald-300"
              : check.full
                ? "border-yellow-500/50 bg-togo-yellow/15 text-yellow-900 dark:text-yellow-100"
                : "border-togo-red/40 bg-togo-red/10 text-togo-red dark:text-red-300",
        )}
      >
        {checking || !check ? (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
        ) : check.ok ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : check.full ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <div>
          {checking || !check ? (
            <span>Vérification de la disponibilité…</span>
          ) : check.ok ? (
            <span>
              Disponible — {check.capacity - check.taken}/{check.capacity} place(s) libre(s) sur ce créneau.
            </span>
          ) : (
            <span>{check.reason}</span>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="purpose">Objet de la réservation (projet, pièce à fabriquer…)</Label>
        <Textarea id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Ex. Impression du boîtier de ma station météo (fichier STL prêt)" maxLength={300} />
      </div>

      {state?.error && !state.full && <p className="rounded-xl bg-togo-red/10 px-3 py-2 text-base text-togo-red">{state.error}</p>}
      {wlState?.error && <p className="rounded-xl bg-togo-red/10 px-3 py-2 text-base text-togo-red">{wlState.error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg" className="flex-1" disabled={pending || !resourceId || (check ? !check.ok : false)}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />} Envoyer la demande
        </Button>
        {showFull && (
          <Button
            type="button"
            variant="warning"
            size="lg"
            className="flex-1"
            disabled={wlPending}
            onClick={() => {
              const fd = new FormData();
              fd.set("resourceId", String(resourceId));
              fd.set("date", date);
              fd.set("start", start);
              fd.set("duration", String(duration));
              fd.set("purpose", purpose);
              startTransition(() => wlAction(fd));
            }}
          >
            {wlPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListPlus className="h-4 w-4" />} Rejoindre la liste d'attente
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Votre demande sera validée par le FabManager. Vous recevrez une notification instantanée à la confirmation, la modification ou l'annulation.
      </p>
    </form>
  );
}
