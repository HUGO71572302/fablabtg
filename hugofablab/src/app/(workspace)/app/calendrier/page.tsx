import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, gt, lt } from "drizzle-orm";
import { PlusCircle } from "lucide-react";
import { db } from "@/db";
import { closures } from "@/db/schema";
import { WeekCalendar, type CalDay, type CalItem } from "@/components/reservations/week-calendar";
import { PageHeader, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { DAY_NAMES, DAY_SHORT, MONTH_NAMES, addDays, dayKey, fmtTime, minutesOfDay, parseDayKey, startOfWeek, timeToMinutes } from "@/lib/dates";
import { getSettings, listReservations, listResourcesWithRooms } from "@/lib/reservations";

export const metadata: Metadata = { title: "Calendrier" };
export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const user = await requireUser();
  const admin = user.role === "fabmanager";
  const { week } = await searchParams;
  const now = new Date();
  const weekStart = startOfWeek(parseDayKey(week) ?? now);
  const weekEnd = addDays(weekStart, 7);
  const [settings, resources, reservations, weekClosures] = await Promise.all([
    getSettings(user.labId),
    listResourcesWithRooms(user.labId),
    listReservations({ labId: user.labId, from: weekStart, to: weekEnd, notStatus: "annulee" }),
    db.select().from(closures).where(and(eq(closures.labId, user.labId), lt(closures.startAt, weekEnd), gt(closures.endAt, weekStart))),
  ]);
  const openDays = settings.openDays.split(",").map(Number);
  const todayKey = dayKey(now);
  const days: CalDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const key = dayKey(d);
    const globalClosure = weekClosures.find(
      (c) => !c.resourceId && c.startAt.getTime() <= d.getTime() + 8 * 3600000 && c.endAt.getTime() >= d.getTime() + 17 * 3600000,
    );
    return {
      key,
      label: `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`,
      shortLabel: DAY_SHORT[d.getUTCDay()],
      dateNum: d.getUTCDate(),
      isOpen: openDays.includes(d.getUTCDay()) && !globalClosure,
      isToday: key === todayKey,
      closure: globalClosure?.reason,
    };
  });
  const items: CalItem[] = reservations
    .filter((r) => r.status !== "annulee")
    .map((r) => {
      const mine = r.user.id === user.id;
      const endMin = minutesOfDay(r.endAt) === 0 ? 1440 : minutesOfDay(r.endAt);
      return {
        id: r.id,
        dayKey: dayKey(r.startAt),
        startMin: minutesOfDay(r.startAt),
        endMin,
        startLabel: fmtTime(r.startAt),
        endLabel: fmtTime(r.endAt),
        title: r.resource.name,
        subtitle: admin || mine ? r.user.name.split(" ")[0] + (mine ? " (moi)" : "") : "Occupé",
        status: r.status as "en_attente" | "confirmee",
        mine,
        resourceId: r.resource.id,
        href: admin ? `/admin/reservations?focus=${r.id}` : mine ? "/app/reservations" : undefined,
      };
    });
  const end = addDays(weekStart, 6);
  const title = `${weekStart.getUTCDate()} ${weekStart.getUTCMonth() !== end.getUTCMonth() ? MONTH_NAMES[weekStart.getUTCMonth()] : ""} – ${end.getUTCDate()} ${MONTH_NAMES[end.getUTCMonth()]} ${end.getUTCFullYear()}`.replace(/\s+/g, " ");

  return (
    <div>
      <PageHeader
        title="Calendrier des salles et machines"
        subtitle="Vue en temps réel des créneaux réservés. Heure du FabLab (GMT, Lomé)."
        action={
          <Link href="/app/reserver" className={buttonClass("primary", "md")}>
            <PlusCircle className="h-4 w-4" /> Réserver
          </Link>
        }
      />
      <WeekCalendar
        days={days}
        items={items}
        resources={resources.filter((r) => r.status !== "desactivee").map((r) => ({ id: r.id, name: r.name, type: r.type }))}
        openMin={timeToMinutes(settings.openTime)}
        closeMin={timeToMinutes(settings.closeTime)}
        title={title}
        prevHref={`/app/calendrier?week=${dayKey(addDays(weekStart, -7))}`}
        nextHref={`/app/calendrier?week=${dayKey(addDays(weekStart, 7))}`}
        todayHref="/app/calendrier"
      />
      {weekClosures.filter((c) => c.resourceId).length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-base">
          <p className="font-semibold">Indisponibilités cette semaine</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {weekClosures
              .filter((c) => c.resourceId)
              .map((c) => (
                <li key={c.id}>
                  🔧 {resources.find((r) => r.id === c.resourceId)?.name ?? "Ressource"} — {c.reason} ({DAY_SHORT[c.startAt.getUTCDay()]} {c.startAt.getUTCDate()}, {fmtTime(c.startAt)} → {fmtTime(c.endAt)})
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
