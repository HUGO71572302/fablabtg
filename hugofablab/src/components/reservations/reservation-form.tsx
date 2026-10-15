"use client";

import { startTransition, useActionState, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, Expand, ListPlus, Loader2, Lock, DoorOpen, Wrench, XCircle, WifiOff } from "lucide-react";
import { openImageViewer } from "@/components/system/image-viewer";
import { toast } from "sonner";
import { checkSlotAction, createReservationAction, joinWaitlistAction, type ReserveState } from "@/actions/reservations";
import { listPendingReservations, removePendingReservation, savePendingReservation, type PendingReservation } from "@/lib/offline-reservations";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { Button, Input, Label, LevelBadge, Select, Textarea, cn } from "@/components/ui";
import type { Level, ResourceStatus } from "@/db/schema";
import { durationLabel, minutesToTime, timeToMinutes } from "@/lib/dates";
import { LEVEL_LABEL, RESOURCE_STATUS_LABEL } from "@/lib/labels";
import type { SlotCheck } from "@/lib/reservations";

const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

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
  userId,
}: {
  resources: FormResource[];
  settings: { openTime: string; closeTime: string; slotStepMinutes: number; maxDurationMinutes: number; openDays: number[] };
  defaultResourceId?: number;
  today: string;
  isAdmin: boolean;
  userId: number;
}) {
  const router = useRouter();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
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
  const [pendingReservations, setPendingReservations] = useState<PendingReservation[]>([]);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [failedReservationId, setFailedReservationId] = useState<string | null>(null);
  const syncing = useRef(false);

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
    if (!online || !resourceId || !date || !start || !duration) return;
    const t = setTimeout(() => {
      startChecking(async () => {
        const res = await checkSlotAction({ resourceId, date, start, duration });
        setCheck(res);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [online, resourceId, date, start, duration]);

  const syncPendingReservations = useCallback(async () => {
    if (!online || syncing.current) return;
    syncing.current = true;
    setSyncError(null);
    try {
      const queued = await listPendingReservations(userId);
      setPendingReservations(queued);
      let failedId: string | null = null;
      for (const reservation of queued) {
        const fd = new FormData();
        fd.set("resourceId", String(reservation.resourceId));
        fd.set("date", reservation.date);
        fd.set("start", reservation.start);
        fd.set("duration", String(reservation.duration));
        fd.set("purpose", reservation.purpose);
        fd.set("clientRequestId", reservation.id);
        const result = await createReservationAction(null, fd);
        if (result?.error) {
          failedId = reservation.id;
          setSyncError(`Demande du ${reservation.date} à ${reservation.start} non synchronisée : ${result.error}`);
          setFailedReservationId(failedId);
          break;
        }
        await removePendingReservation(reservation.id);
      }
      if (!failedId) setFailedReservationId(null);
      setPendingReservations(await listPendingReservations(userId));
      router.refresh();
    } catch (error) {
      console.error("Échec de la synchronisation des réservations hors ligne.", error);
      setSyncError("La synchronisation a échoué. La demande reste conservée sur cet appareil ; réessayez quand la connexion sera stable.");
    } finally {
      syncing.current = false;
    }
  }, [online, router, userId]);

  useEffect(() => {
    let active = true;
    listPendingReservations(userId)
      .then((queued) => {
        if (active) {
          setPendingReservations(queued);
          if (navigator.onLine) void syncPendingReservations();
        }
      })
      .catch((error: unknown) => {
        console.error("Impossible de lire les réservations conservées hors ligne.", error);
        if (active) {
          setOfflineError("Impossible de lire les demandes conservées sur cet appareil.");
        }
      });
    const onOnline = () => void syncPendingReservations();
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
    };
  }, [syncPendingReservations, userId]);

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
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={(event) => {
        if (online) return;
        event.preventDefault();
        const id = crypto.randomUUID();
        const reservation: PendingReservation = {
          id,
          userId,
          resourceId,
          date,
          start,
          duration,
          purpose: purpose.trim(),
          createdAt: Date.now(),
        };
        void savePendingReservation(reservation)
          .then(async () => {
            setOfflineError(null);
            setPendingReservations(await listPendingReservations(userId));
            if (navigator.onLine) void syncPendingReservations();
            toast.success("Demande conservée sur cet appareil", {
              description: "Elle sera vérifiée et envoyée au FabManager dès le retour d’Internet. Le créneau n’est pas encore réservé.",
            });
          })
          .catch((error: unknown) => {
            console.error("Impossible de conserver la réservation hors ligne.", error);
            setOfflineError("La demande n’a pas pu être conservée sur cet appareil. Libérez de l’espace puis réessayez.");
          });
      }}
    >
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
        {!online ? (
          <span>Hors connexion : la disponibilité sera vérifiée à la synchronisation.</span>
        ) : checking || !check ? (
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
      {offlineError && <p role="alert" className="rounded-xl bg-togo-red/10 px-3 py-2 text-base text-togo-red">{offlineError}</p>}
      {syncError && (
        <div role="alert" className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-3 text-base">
          <p>{syncError}</p>
          <Button type="button" variant="warning" size="sm" className="mt-2" onClick={() => void syncPendingReservations()}>
            Réessayer la synchronisation
          </Button>
        </div>
      )}
      {pendingReservations.length > 0 && (
        <div role="status" className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-3 text-base">
          <p className="flex items-center gap-2 font-semibold"><WifiOff className="h-4 w-4" /> {pendingReservations.length} demande(s) en attente de vérification en ligne</p>
          <ul className="mt-2 space-y-1 text-sm">
            {pendingReservations.map((reservation) => (
              <li key={reservation.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{resources.find((item) => item.id === reservation.resourceId)?.name ?? "Ressource"} · {reservation.date} à {reservation.start}</span>
                {failedReservationId === reservation.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void removePendingReservation(reservation.id)
                        .then(async () => {
                          setPendingReservations(await listPendingReservations(userId));
                          setFailedReservationId(null);
                          setSyncError(null);
                        })
                        .catch((error: unknown) => {
                          console.error("Impossible de supprimer la réservation hors ligne.", error);
                          setOfflineError("Impossible de supprimer cette demande conservée sur l’appareil.");
                        });
                    }}
                  >
                    Supprimer
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg" className="flex-1" disabled={pending || !resourceId || (online && (checking || !check?.ok))}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : online ? <Clock3 className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />} {online ? "Envoyer la demande" : "Garder sur cet appareil"}
        </Button>
        {online && showFull && (
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
            {wlPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListPlus className="h-4 w-4" />} Rejoindre la liste d&apos;attente
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {online
          ? "Votre demande sera validée par le FabManager. Vous recevrez une notification instantanée à la confirmation, la modification ou l'annulation."
          : "Votre demande reste locale et non confirmée jusqu’au retour d’Internet. La disponibilité sera alors vérifiée avant tout envoi au FabManager."}
      </p>
    </form>
  );
}
