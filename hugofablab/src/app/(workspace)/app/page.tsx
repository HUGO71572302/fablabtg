import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { ArrowUpRight, Bell, CalendarDays, ChevronRight, ListChecks, Megaphone, PlusCircle } from "lucide-react";
import { db } from "@/db";
import { notifications, waitlist } from "@/db/schema";
import { ReservationCard } from "@/components/reservations/reservation-card";
import { CancelReservationButton } from "@/components/reservations/student-actions";
import { Card, CardContent, CardHeader, EmptyState, LevelBadge, Stat, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/dates";
import { NOTIF_META } from "@/lib/labels";
import { getSettings, listReservations } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export default async function StudentHome() {
  const user = await requireUser();
  const now = new Date();
  const [settings, upcoming, recent, waiting] = await Promise.all([
    getSettings(user.labId),
    listReservations({ labId: user.labId, userId: user.id, endAfter: now, notStatus: "annulee", limit: 5 }),
    db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.id)).limit(5),
    db.select().from(waitlist).where(and(eq(waitlist.userId, user.id), eq(waitlist.status, "active"))),
  ]);
  const pendingCount = upcoming.filter((r) => r.status === "en_attente").length;
  const confirmedCount = upcoming.filter((r) => r.status === "confirmee").length;
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-base text-muted-foreground">Bonjour 👋</p>
          <h1 className="text-3xl font-bold tracking-tight">{firstName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <LevelBadge level={user.autonomyLevel} />
            {user.organisation && <span className="text-sm text-muted-foreground">{user.organisation}</span>}
          </div>
        </div>
        <Link href="/app/reserver" className={buttonClass("primary", "lg")}>
          <PlusCircle className="h-5 w-5" /> Nouvelle réservation
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[22px] bg-forest text-white">
        <img src="/images/electronics-detail.jpg" data-gallery="atelier" alt="Illustration d’un projet électronique dans l’atelier" className="absolute inset-y-0 right-0 hidden h-full w-[40%] object-cover sm:block" />
        <div className="absolute inset-0 bg-gradient-to-r from-forest from-50% to-forest/30" />
        <div className="relative p-6 sm:p-8"><p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-lime/80">Il suffit d’une idée</p><h2 className="mt-3 max-w-xs text-[26px] font-extrabold leading-tight tracking-tight">L’atelier vous attend.</h2><p className="mt-2 max-w-[280px] text-sm leading-6 text-white/70">Choisissez une machine, trouvez votre créneau et passez de l’idée à l’objet.</p><Link href="/app/reserver" className={buttonClass("warning", "md", "mt-5 text-sm")}>Réserver ma prochaine séance<ArrowUpRight className="h-4 w-4" /></Link></div>
      </section>
      {settings.announcement && (
        <div className="flex items-start gap-3 rounded-2xl border-l-4 border-togo-yellow bg-togo-yellow/10 p-4 text-base">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700 dark:text-yellow-200" />
          <p>{settings.announcement}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="À venir" value={upcoming.length} accent="green" />
        <Stat label="Confirmées" value={confirmedCount} accent="green" />
        <Stat label="En attente" value={pendingCount} accent="yellow" />
        <Stat label="Liste d'attente" value={waiting.length} accent="red" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><ListChecks className="h-4 w-4" /> Mes prochaines réservations</h2>
            <Link href="/app/reservations" className="inline-flex items-center text-base text-togo-green hover:underline dark:text-emerald-300">
              Tout voir <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {upcoming.length ? (
            upcoming.map((r) => <ReservationCard key={r.id} r={r} actions={<CancelReservationButton id={r.id} />} />)
          ) : (
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" />}
              title="Aucune réservation à venir"
              text="Choisissez une machine ou une salle et proposez un créneau : le FabManager le validera."
              action={<Link href="/app/reserver" className={buttonClass("primary", "md")}>Réserver un créneau</Link>}
            />
          )}
        </div>
        <Card className="h-fit">
          <CardHeader
            title={<span className="flex items-center gap-2"><Bell className="h-4 w-4" /> Dernières notifications</span>}
            action={<Link href="/app/notifications" className="text-sm text-togo-green hover:underline dark:text-emerald-300">Historique</Link>}
          />
          <CardContent>
            {recent.length ? (
              <ul className="space-y-3">
                {recent.map((n) => (
                  <li key={n.id} className="flex gap-2 text-base">
                    <span className="text-lg leading-none">{NOTIF_META[n.type].emoji}</span>
                    <div className="min-w-0">
                      <p className={n.read ? "font-medium" : "font-semibold"}>{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-muted-foreground">Aucune notification pour l'instant.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
