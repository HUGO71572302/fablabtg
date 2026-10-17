import Link from "next/link";
import { and, count, desc, eq, gt } from "drizzle-orm";
import { Activity, ArrowUpRight, CalendarDays, ChevronRight, Hourglass, Images, MessageSquareQuote, Plus, Star, Wrench } from "lucide-react";
import { db } from "@/db";
import { closures, notifications, resources, users } from "@/db/schema";
import { AdminReservationItem } from "@/components/admin/reservation-item";
import { ReservationCard } from "@/components/reservations/reservation-card";
import { Card, CardContent, CardHeader, EmptyState, PageHeader, Stat, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { addDays, fmtDateCompact, fmtTime, startOfDayUTC, timeAgo } from "@/lib/dates";
import { NOTIF_META } from "@/lib/labels";
import { getSettings, listReservations, listResourcesWithRooms } from "@/lib/reservations";
import { stockAlerts, stockCounts } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const now = new Date();
  const today = startOfDayUTC(now);
  const tomorrow = addDays(today, 1);
  const [settings, allResources, pending, todayList, [{ n: members }], activity, upcomingClosures, alertList, summary] = await Promise.all([
    getSettings(admin.labId),
    listResourcesWithRooms(admin.labId),
    listReservations({ labId: admin.labId, status: "en_attente", endAfter: now }),
    listReservations({ labId: admin.labId, from: today, to: tomorrow, notStatus: "annulee" }),
    db.select({ n: count() }).from(users).where(and(eq(users.labId, admin.labId), eq(users.active, true))),
    db.select().from(notifications).where(eq(notifications.userId, admin.id)).orderBy(desc(notifications.id)).limit(8),
    db.select().from(closures).where(and(eq(closures.labId, admin.labId), gt(closures.endAt, now))).limit(5),
    stockAlerts(admin.labId, 4),
    stockCounts(admin.labId),
  ]);
  const [stockAlertList, stockSummary] = [alertList, summary];
  const maintenance = allResources.filter((r) => r.status === "maintenance").length;
  const resourceOptions = allResources.map((r) => ({ id: r.id, name: r.name, type: r.type, maxDurationMinutes: r.maxDurationMinutes }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour, ${admin.name.split(" ")[0]}.`}
        subtitle={`Votre atelier, en un coup d’œil · ${fmtDateCompact(now)} · ${fmtTime(now)} (GMT)`}
        action={
          <Link href="/app/calendrier" className={buttonClass("outline", "md")}>
            <CalendarDays className="h-4 w-4" /> Calendrier global
          </Link>
        }
      />
      <section className="relative overflow-hidden rounded-[22px] bg-forest p-6 text-white sm:p-8">
        <div className="grid-paper absolute inset-0 opacity-80" />
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full border border-lime/15" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div><p className="text-[13px] font-semibold uppercase tracking-[0.17em] text-lime/80">L’atelier des possibles</p><h2 className="mt-3 text-[24px] font-extrabold tracking-tight sm:text-[29px]">Faites grandir les idées.</h2><p className="mt-2 max-w-sm text-sm leading-6 text-white/70">Vos machines, leurs projets. Tout ce qu’il faut pour faire vivre votre FabLab, au même endroit.</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/admin/ressources" className={buttonClass("warning", "md", "text-sm")}><Plus className="h-4 w-4" />Mes machines<ArrowUpRight className="h-3.5 w-3.5" /></Link><Link href="/admin/projets" className={buttonClass("outline", "md", "border-white/20 text-white hover:bg-white/10 text-sm")}><Images className="h-4 w-4" />Les projets</Link><Link href="/admin/avis" className={buttonClass("outline", "md", "border-lime/30 bg-lime/10 text-lime hover:bg-lime/20 text-sm")}><MessageSquareQuote className="h-4 w-4" />Avis des membres<Star className="h-3.5 w-3.5 fill-current" /></Link></div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Demandes en attente" value={pending.length} accent="yellow" hint="À valider" />
        <Stat label="Aujourd'hui" value={todayList.length} accent="green" hint="créneaux planifiés" />
        <Stat label="Machines en maintenance" value={maintenance} accent="red" />
        <Stat label="Membres actifs" value={members} accent="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><Hourglass className="h-4 w-4 text-yellow-600" /> Demandes en attente</h2>
            <Link href="/admin/reservations?status=en_attente" className="inline-flex items-center text-base text-togo-green hover:underline dark:text-emerald-300">
              Tout voir <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {pending.length ? (
            pending.slice(0, 6).map((r) => <AdminReservationItem key={r.id} r={r} resources={resourceOptions} settings={settings} userId={admin.id} />)
          ) : (
            <EmptyState title="Aucune demande en attente" text="Toutes les demandes ont été traitées. 🎉" />
          )}

          <h2 className="flex items-center gap-2 pt-4 font-semibold"><CalendarDays className="h-4 w-4" /> Agenda du jour</h2>
          {todayList.length ? (
            <div className="space-y-2">
              {todayList.map((r) => <ReservationCard key={r.id} r={r} showUser showQr={false} className="p-3" />)}
            </div>
          ) : (
            <EmptyState title="Rien de prévu aujourd'hui" />
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><Activity className="h-4 w-4" /> Activité récente</span>} />
            <CardContent>
              {activity.length ? (
                <ul className="space-y-3">
                  {activity.map((n) => (
                    <li key={n.id} className="flex gap-2 text-base">
                      <span>{NOTIF_META[n.type].emoji}</span>
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{n.title}</p>
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                        <p className="text-[13px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base text-muted-foreground">Aucune activité.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader
              title={<span className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Indisponibilités à venir</span>}
              action={<Link href="/admin/disponibilites" className="text-sm text-togo-green hover:underline dark:text-emerald-300">Gérer</Link>}
            />
            <CardContent>
              {upcomingClosures.length ? (
                <ul className="space-y-2 text-base">
                  {upcomingClosures.map((c) => (
                    <li key={c.id} className="rounded-xl bg-muted/60 px-3 py-2">
                      <p className="font-medium">{c.resourceId ? allResources.find((r) => r.id === c.resourceId)?.name : "Tout le FabLab"}</p>
                      <p className="text-sm text-muted-foreground">{c.reason} · {fmtDateCompact(c.startAt)} {fmtTime(c.startAt)} → {fmtDateCompact(c.endAt)} {fmtTime(c.endAt)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base text-muted-foreground">Aucune fermeture planifiée.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              eyebrow="Matériel"
              title="Stock à surveiller"
              subtitle={summary.low + summary.out > 0 ? `${summary.low + summary.out} article(s) sous le seuil ou en rupture.` : "Tout est au-dessus des seuils définis."}
              action={<Link href="/admin/stock" className="text-sm font-bold text-togo-green hover:underline dark:text-lime">Ouvrir le stock</Link>}
            />
            <CardContent>
              {stockAlertList.length ? (
                <ul className="space-y-2">
                  {stockAlertList.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold">{a.name}</p>
                        <p className="text-[13px] text-muted-foreground">{a.location ?? "Emplacement à préciser"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[13px] font-bold ${a.out ? "bg-togo-red/10 text-togo-red" : "bg-togo-yellow/20 text-amber-700 dark:text-togo-yellow"}`}>
                        {a.out ? "Rupture" : `${a.quantity} ${a.unit}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base text-muted-foreground">Aucun réapprovisionnement urgent.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
