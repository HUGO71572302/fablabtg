"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClass, cn } from "@/components/ui";

export type CalItem = {
  id: number;
  dayKey: string;
  startMin: number;
  endMin: number;
  startLabel: string;
  endLabel: string;
  title: string;
  subtitle: string;
  status: "en_attente" | "confirmee";
  mine: boolean;
  resourceId: number;
  href?: string;
};
export type CalDay = { key: string; label: string; shortLabel: string; dateNum: number; isOpen: boolean; isToday: boolean; closure?: string };

const PX = 1.15;

function DayColumn({ day, items, openMin, closeMin, hours }: { day: CalDay; items: CalItem[]; openMin: number; closeMin: number; hours: number[] }) {
  const laid = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const lanes: number[] = [];
    const out = sorted.map((it) => {
      let lane = lanes.findIndex((end) => end <= it.startMin);
      if (lane === -1) {
        lanes.push(it.endMin);
        lane = lanes.length - 1;
      } else lanes[lane] = it.endMin;
      return { it, lane };
    });
    return { out, laneCount: Math.max(1, lanes.length) };
  }, [items]);
  const height = (closeMin - openMin) * PX;
  return (
    <div className={cn("relative rounded-xl border border-border", day.isOpen ? "bg-card" : "hatched bg-muted/40")} style={{ height }}>
      {hours.map((h) => (
        <div key={h} className="absolute inset-x-0 border-t border-dashed border-border/70" style={{ top: (h * 60 - openMin) * PX }} />
      ))}
      {!day.isOpen && (
        <div className="absolute inset-0 grid place-items-center p-2 text-center text-sm font-medium text-muted-foreground">
          {day.closure ?? "Fermé"}
        </div>
      )}
      {laid.out.map(({ it, lane }) => {
        const top = Math.max(0, (it.startMin - openMin) * PX);
        const h = Math.max(22, (Math.min(it.endMin, closeMin) - Math.max(it.startMin, openMin)) * PX - 2);
        const width = 100 / laid.laneCount;
        const cls = cn(
          "absolute overflow-hidden rounded-lg border px-1.5 py-1 text-[13px] leading-tight shadow-sm",
          it.status === "confirmee"
            ? "border-togo-green/40 bg-togo-green/15 text-emerald-900 dark:text-emerald-100"
            : "border-yellow-500/50 bg-togo-yellow/30 text-yellow-950 dark:text-yellow-50",
          it.mine && "ring-2 ring-togo-red/70",
        );
        const style = { top, height: h, left: `calc(${lane * width}% + 2px)`, width: `calc(${width}% - 4px)` };
        const body = (
          <>
            <p className="truncate font-semibold">{it.title}</p>
            <p className="truncate opacity-80">
              {it.startLabel}–{it.endLabel} · {it.subtitle}
            </p>
          </>
        );
        return it.href ? (
          <Link key={it.id} href={it.href} className={cls} style={style} title={`${it.title} — ${it.subtitle}`}>
            {body}
          </Link>
        ) : (
          <div key={it.id} className={cls} style={style} title={`${it.title} — ${it.subtitle}`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function WeekCalendar({
  days,
  items,
  resources,
  openMin,
  closeMin,
  title,
  prevHref,
  nextHref,
  todayHref,
}: {
  days: CalDay[];
  items: CalItem[];
  resources: { id: number; name: string; type: string }[];
  openMin: number;
  closeMin: number;
  title: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
}) {
  const [resourceId, setResourceId] = useState<number>(0);
  const [selected, setSelected] = useState<string>(days.find((d) => d.isToday)?.key ?? days[0]?.key);
  const filtered = useMemo(() => (resourceId ? items.filter((i) => i.resourceId === resourceId) : items), [items, resourceId]);
  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = Math.ceil(openMin / 60); h * 60 < closeMin; h++) out.push(h);
    return out;
  }, [openMin, closeMin]);
  const selectedDay: CalDay | undefined = days.find((d) => d.key === selected) ?? days.find((d) => d.isToday) ?? days[0];

  return (
    <div className="space-y-4 rounded-[20px] border border-border bg-card p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Link href={prevHref} className={buttonClass("outline", "icon")} aria-label="Semaine précédente">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href={todayHref} className={buttonClass("outline", "md")}>
            Aujourd'hui
          </Link>
          <Link href={nextHref} className={buttonClass("outline", "icon")} aria-label="Semaine suivante">
            <ChevronRight className="h-4 w-4" />
          </Link>
          <span className="ml-0 mt-1 w-full text-base font-semibold sm:ml-2 sm:mt-0 sm:w-auto">{title}</span>
        </div>
        <select
          value={resourceId}
          onChange={(e) => setResourceId(Number(e.target.value))}
          className="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-border bg-background px-3 py-2 text-base sm:w-auto"
          aria-label="Filtrer par ressource"
        >
          <option value={0}>Toutes les ressources</option>
          <optgroup label="Machines">
            {resources.filter((r) => r.type === "machine").map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </optgroup>
          <optgroup label="Salles">
            {resources.filter((r) => r.type === "salle").map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-togo-green/40 bg-togo-green/20" /> Confirmée</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-yellow-500/50 bg-togo-yellow/40" /> En attente</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded ring-2 ring-togo-red/70" /> Mes réservations</span>
      </div>

      {/* Mobile : sélecteur de jour */}
      <div className="no-scrollbar -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 md:hidden">
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setSelected(d.key)}
            className={cn(
              "flex min-w-[48px] flex-col items-center rounded-xl border px-2 py-2 text-sm",
              d.key === selectedDay?.key ? "border-togo-green bg-togo-green text-white" : "border-border bg-card",
              !d.isOpen && d.key !== selected && "opacity-50",
            )}
          >
            <span>{d.shortLabel}</span>
            <span className="text-lg font-bold">{d.dateNum}</span>
            {d.isToday && <span className="mt-0.5 h-1 w-1 rounded-full bg-togo-yellow" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[2.5rem_1fr] gap-2 md:grid-cols-[2.5rem_repeat(7,minmax(0,1fr))]">
        <div />
        {days.map((d) => (
          <div
            key={d.key}
            className={cn("hidden text-center text-sm font-semibold md:block", d.isToday && "text-togo-green dark:text-emerald-300")}
          >
            {d.shortLabel} <span className="text-lg">{d.dateNum}</span>
          </div>
        ))}
        {selectedDay && (
          <div className="text-center text-base font-semibold md:hidden">
            {selectedDay.label}
          </div>
        )}

        <div className="relative" style={{ height: (closeMin - openMin) * PX }}>
          {hours.map((h) => (
            <span key={h} className="absolute -translate-y-1/2 text-[13px] text-muted-foreground" style={{ top: (h * 60 - openMin) * PX }}>
              {String(h).padStart(2, "0")}h
            </span>
          ))}
        </div>
        {days.map((d) => (
          <div key={d.key} className={cn(d.key === selectedDay?.key ? "block" : "hidden md:block")}>
            <DayColumn day={d} items={filtered.filter((i) => i.dayKey === d.key)} openMin={openMin} closeMin={closeMin} hours={hours} />
          </div>
        ))}
      </div>
    </div>
  );
}
