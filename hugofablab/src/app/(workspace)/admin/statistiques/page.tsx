import type { Metadata } from "next";
import { and, count, desc, eq, gte, isNotNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, reservations, resources, users } from "@/db/schema";
import { Card, CardContent, CardHeader, PageHeader, Stat } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { MONTH_SHORT } from "@/lib/dates";
import { CLASS_LEVELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Statistiques" };
export const dynamic = "force-dynamic";

function Bars({ rows, unit }: { rows: { label: string; value: number; hint?: string }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-base text-muted-foreground">Pas encore de données.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-center justify-between text-base">
            <span className="truncate font-medium">{r.label}</span>
            <span className="text-muted-foreground">{r.value} {unit}{r.hint ? ` · ${r.hint}` : ""}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="tricolor h-full rounded-full" style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function StatsPage() {
  const admin = await requireAdmin();
  const lab = eq(resources.labId, admin.labId);
  const now = new Date();
  const hoursExpr = sql<number>`round(sum(extract(epoch from (${reservations.endAt} - ${reservations.startAt})) / 3600)::numeric, 1)`;
  const base = () => db.select({ n: count() }).from(reservations).innerJoin(resources, eq(reservations.resourceId, resources.id));
  const [byStatus, byResource, byClass, [attendance], [{ n: students }], [{ n: nProjects }], sixMonths, [{ n: checkedIn }]] = await Promise.all([
    db.select({ status: reservations.status, n: count() }).from(reservations).innerJoin(resources, eq(reservations.resourceId, resources.id)).where(lab).groupBy(reservations.status),
    db
      .select({ name: resources.name, n: count(), hours: hoursExpr })
      .from(reservations)
      .innerJoin(resources, eq(reservations.resourceId, resources.id))
      .where(and(lab, ne(reservations.status, "annulee")))
      .groupBy(resources.id, resources.name)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ level: users.classLevel, n: count() })
      .from(reservations)
      .innerJoin(resources, eq(reservations.resourceId, resources.id))
      .innerJoin(users, eq(reservations.userId, users.id))
      .where(and(lab, ne(reservations.status, "annulee")))
      .groupBy(users.classLevel),
    db
      .select({ total: count(), present: sql<number>`count(${reservations.checkedInAt})` })
      .from(reservations)
      .innerJoin(resources, eq(reservations.resourceId, resources.id))
      .where(and(lab, eq(reservations.status, "confirmee"), lt(reservations.endAt, now))),
    db.select({ n: count() }).from(users).where(and(eq(users.labId, admin.labId), eq(users.role, "student"), eq(users.active, true))),
    db.select({ n: count() }).from(projects).where(and(eq(projects.labId, admin.labId), eq(projects.published, true))),
    db
      .select({ month: sql<string>`to_char(date_trunc('month', ${reservations.startAt}), 'YYYY-MM')`, n: count() })
      .from(reservations)
      .innerJoin(resources, eq(reservations.resourceId, resources.id))
      .where(and(lab, ne(reservations.status, "annulee"), gte(reservations.startAt, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)))))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    base().where(and(lab, isNotNull(reservations.checkedInAt))),
  ]);
  const statusCount = (s: string) => byStatus.find((b) => b.status === s)?.n ?? 0;
  const total = byStatus.reduce((a, b) => a + b.n, 0);
  const present = Number(attendance?.present ?? 0);
  const rate = attendance?.total ? Math.round((present / attendance.total) * 100) : 0;
  const monthRows = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { label: `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`, value: sixMonths.find((m) => m.month === key)?.n ?? 0 };
  });
  const classRows = CLASS_LEVELS.map((c) => ({ label: c.label, value: byClass.find((b) => b.level === c.value)?.n ?? 0 }));

  return (
    <div className="space-y-6">
      <PageHeader title="Statistiques d'usage" subtitle="Activité de votre FabLab uniquement." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Réservations" value={total} accent="neutral" />
        <Stat label="Confirmées" value={statusCount("confirmee")} accent="green" />
        <Stat label="En attente" value={statusCount("en_attente")} accent="yellow" />
        <Stat label="Élèves actifs" value={students} accent="green" />
        <Stat label="Taux de présence" value={`${rate}%`} hint={`${checkedIn} pointage(s) · ${nProjects} projet(s) publié(s)`} accent="red" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Utilisation par machine / salle" subtitle="Réservations non annulées et heures cumulées" />
          <CardContent><Bars rows={byResource.map((r) => ({ label: r.name, value: r.n, hint: `${Number(r.hours ?? 0)} h` }))} unit="résa" /></CardContent>
        </Card>
        <Card>
          <CardHeader title="Réservations par classe" subtitle="De la 6e à la Terminale" />
          <CardContent><Bars rows={classRows} unit="résa" /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Réservations par mois" subtitle="6 derniers mois" />
          <CardContent><Bars rows={monthRows} unit="résa" /></CardContent>
        </Card>
      </div>
    </div>
  );
}
