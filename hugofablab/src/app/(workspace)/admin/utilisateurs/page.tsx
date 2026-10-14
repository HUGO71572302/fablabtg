import type { Metadata } from "next";
import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { Phone, Printer, UserRound } from "lucide-react";
import { db } from "@/db";
import { reservations, resources, userSkills, users, type Level } from "@/db/schema";
import { UserControls } from "@/components/admin/user-controls";
import { Badge, LevelBadge, PageHeader } from "@/components/ui";
import { ContactButtons } from "@/components/ui/contact";
import { requireAdmin } from "@/lib/auth";
import { fmtDateCompact } from "@/lib/dates";
import { CLASS_LEVELS, classLabel } from "@/lib/labels";
import { listResourcesWithRooms } from "@/lib/reservations";

export const metadata: Metadata = { title: "Élèves" };
export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ classe?: string; q?: string }> }) {
  const admin = await requireAdmin();
  const { classe, q } = await searchParams;
  const [list, allResources] = await Promise.all([
    db.select().from(users).where(eq(users.labId, admin.labId)).orderBy(asc(users.name)),
    listResourcesWithRooms(admin.labId),
  ]);
  const ids = list.map((u) => u.id);
  const [skills, counts] = ids.length
    ? await Promise.all([
        db.select().from(userSkills).where(inArray(userSkills.userId, ids)),
        db
          .select({ userId: reservations.userId, n: count() })
          .from(reservations)
          .innerJoin(resources, eq(reservations.resourceId, resources.id))
          .where(and(eq(resources.labId, admin.labId), ne(reservations.status, "annulee")))
          .groupBy(reservations.userId),
      ])
    : [[], []];
  const machines = allResources.filter((r) => r.type === "machine" && r.status !== "desactivee").map((m) => ({ id: m.id, name: m.name, requiredLevel: m.requiredLevel }));
  const countMap = new Map(counts.map((c) => [c.userId, c.n]));
  const needle = (q ?? "").trim().toLowerCase();
  const filtered = list
    .filter((u) => !classe || u.classLevel === classe)
    .filter((u) => !needle || [u.name, u.username, u.phone, u.email].some((v) => v?.toLowerCase().includes(needle)))
    .sort((a, b) => (a.role === "fabmanager" ? -1 : b.role === "fabmanager" ? 1 : 0));
  const students = list.filter((u) => u.role !== "fabmanager");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader title="Élèves du lab" subtitle={`${students.length} élève(s) inscrit(s) · attribuez les niveaux, réinitialisez un code PIN oublié, désactivez un compte.`} />
      <form className="flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={q ?? ""} placeholder="Rechercher (nom, identifiant, téléphone)" className="min-w-[220px] flex-1 rounded-xl border border-border bg-card px-3 py-2 text-base" />
        <select name="classe" defaultValue={classe ?? ""} className="rounded-xl border border-border bg-card px-3 py-2 text-base">
          <option value="">Toutes les classes</option>
          {CLASS_LEVELS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label} ({students.filter((s) => s.classLevel === c.value).length})
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-xl border border-border px-4 py-2 text-base hover:bg-muted">Filtrer</button>
      </form>
      <ul className="space-y-3">
        {filtered.map((u) => {
          const userSkillMap: Record<number, Level> = {};
          skills.filter((s) => s.userId === u.id).forEach((s) => (userSkillMap[s.resourceId] = s.level));
          return (
            <li key={u.id} className={`rounded-2xl border border-border bg-card p-4 ${!u.active ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-togo-yellow/25 font-bold text-yellow-900 dark:text-yellow-100">{u.name.charAt(0)}</span>
                <div className="min-w-0">
                  <p className="font-semibold">
                    {u.name}{" "}
                    {u.role === "fabmanager" ? (
                      <Badge tone="red" className="ml-1 align-middle">Responsable</Badge>
                    ) : u.classLevel ? (
                      <Badge tone="green" className="ml-1 align-middle">{classLabel(u.classLevel, u.organisation)}</Badge>
                    ) : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> {u.username ?? u.email ?? "—"}</span>
                    {u.phone && (
                      <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {u.phone} <ContactButtons phone={u.phone} email={u.email} compact /></span>
                    )}
                    <span>{countMap.get(u.id) ?? 0} réservation(s) · inscrit le {fmtDateCompact(u.createdAt)}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5">
                    <LevelBadge level={u.autonomyLevel} />
                    {!u.active && <Badge tone="red">Désactivé</Badge>}
                    {u.lockedUntil && u.lockedUntil > new Date() && <Badge tone="yellow">Bloqué (trop d'essais)</Badge>}
                    {u.role !== "fabmanager" && (
                      <a href={`/print/apprenant/${u.id}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-togo-green transition hover:bg-muted dark:text-lime">
                        <Printer className="h-3.5 w-3.5" /> Imprimer la fiche
                      </a>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <UserControls user={{ id: u.id, name: u.name, role: u.role, active: u.active, autonomyLevel: u.autonomyLevel, username: u.username }} machines={machines} skills={userSkillMap} />
              </div>
            </li>
          );
        })}
        {!filtered.length && <li className="rounded-2xl border border-dashed border-border p-6 text-center text-base text-muted-foreground">Aucun élève ne correspond.</li>}
      </ul>
    </div>
  );
}
