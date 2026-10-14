import type { ReactNode } from "react";
import { CalendarDays, Clock3, DoorOpen, MapPinCheck, StickyNote, User2 } from "lucide-react";
import { QrDialog } from "@/components/reservations/qr-dialog";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { StatusBadge, cn } from "@/components/ui";
import { durationLabel, fmtDateCompact, fmtTime, relativeDay } from "@/lib/dates";
import { classLabel } from "@/lib/labels";
import type { ReservationView } from "@/lib/reservations";

export function ReservationCard({ r, showUser = false, showQr = true, actions, className }: { r: ReservationView; showUser?: boolean; showQr?: boolean; actions?: ReactNode; className?: string }) {
  const minutes = Math.round((r.endAt.getTime() - r.startAt.getTime()) / 60000);
  const past = r.endAt.getTime() < Date.now();
  return (
    <article className={cn("min-w-0 rounded-[18px] border border-border bg-card p-4", past && "opacity-80", className)}>
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-muted text-togo-green dark:text-lime"><ResourceIcon icon={r.resource.icon} className="h-5 w-5 stroke-[1.6]" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-[15px] font-bold leading-snug">{r.resource.name}</h3><StatusBadge status={r.status} /></div><p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3 shrink-0" />{relativeDay(r.startAt)} · {fmtDateCompact(r.startAt)}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3 shrink-0" />{fmtTime(r.startAt)}–{fmtTime(r.endAt)} ({durationLabel(minutes)})</span>{r.room && <span className="inline-flex items-center gap-1"><DoorOpen className="h-3 w-3 shrink-0" />{r.room.name}</span>}</p>{showUser && <p className="mt-2 flex flex-wrap items-center gap-1 text-[13px]"><User2 className="h-3 w-3 shrink-0 text-muted-foreground" /><b>{r.user.name}</b><span className="text-muted-foreground">{r.user.classLevel ? `· ${classLabel(r.user.classLevel, r.user.organisation)}` : r.user.organisation ? `· ${r.user.organisation}` : ""}</span></p>}{r.purpose && <p className="mt-2 break-words text-sm leading-5 text-muted-foreground">{r.purpose}</p>}</div></div>
      {r.adminNote && <p className="mt-3 flex items-start gap-2 rounded-xl bg-togo-yellow/10 px-3 py-2.5 text-[13px] leading-5 text-foreground"><StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /><span><b>Note du responsable :</b> {r.adminNote}</span></p>}
      {r.checkedInAt && <p className="mt-3 flex items-center gap-1.5 text-[13px] text-togo-green dark:text-lime"><MapPinCheck className="h-3.5 w-3.5" />Présence pointée à {fmtTime(r.checkedInAt)}</p>}
      {(actions || (showQr && r.status === "confirmee" && !past)) && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">{showQr && r.status === "confirmee" && !past && <QrDialog token={r.qrToken} title={r.resource.name} subtitle={`${fmtDateCompact(r.startAt)} · ${fmtTime(r.startAt)}–${fmtTime(r.endAt)}`} />}{actions}</div>}
    </article>
  );
}
