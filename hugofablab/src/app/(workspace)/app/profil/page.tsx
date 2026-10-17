import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { Lock, LockOpen, Mail, Phone, Printer, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { userSkills, users } from "@/db/schema";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { GradeRow } from "@/components/admin/grade-form";
import { ContactButtons } from "@/components/ui/contact";
import { OfflineLogoutButton } from "@/components/auth/offline-logout-button";
import { Card, CardContent, CardHeader, LevelBadge, PageHeader, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/dates";
import { LEVEL_LABEL, ROLE_LABEL, classLabel, levelAllows, maxLevel } from "@/lib/labels";
import { listResourcesWithRooms } from "@/lib/reservations";
import { assignSheetNumber, classRank, gradesStats, listGrades } from "@/lib/pedagogy";

export const metadata: Metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

async function selectManager(labId: number) {
  return db.select({ name: users.name, phone: users.phone, email: users.email }).from(users).where(and(eq(users.labId, labId), eq(users.role, "fabmanager"))).orderBy(users.name).limit(1);
}

export default async function ProfilePage() {
  const user = await requireUser();
  const [resources, skills] = await Promise.all([
    listResourcesWithRooms(user.labId),
    db.select().from(userSkills).where(eq(userSkills.userId, user.id)),
  ]);
  const manager = user.role === "fabmanager" ? null : (await selectManager(user.labId))[0] ?? null;
  const isStudent = user.role === "student";
  const sheetNumber = isStudent ? await assignSheetNumber(user) : null;
  const [rank, stats, gradeRows] = !isStudent
    ? [null, null, [] as Awaited<ReturnType<typeof listGrades>>]
    : await Promise.all([classRank(user), gradesStats(user.id), listGrades(user.id)]);
  const machines = resources.filter((r) => r.type === "machine" && r.status !== "desactivee");
  const unlocked = machines.filter((m) => {
    const s = skills.find((k) => k.resourceId === m.id);
    return levelAllows(s ? maxLevel(user.autonomyLevel, s.level) : user.autonomyLevel, m.requiredLevel);
  }).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Mon profil"
        subtitle="Vos informations et vos niveaux d'autonomie par machine."
        action={isStudent ? (
          <a href={`/print/apprenant/${user.id}`} className={buttonClass("outline", "md")}>
            <Printer className="h-4 w-4" /> Imprimer mon historique
          </a>
        ) : null}
      />
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-togo-yellow/30 text-3xl font-black text-yellow-900 dark:text-yellow-100">
              {user.name.charAt(0)}
            </div>
            <h2 className="mt-3 text-xl font-bold">{user.name}</h2>
            <p className="text-base text-muted-foreground">
              {ROLE_LABEL[user.role]}
              {user.classLevel ? ` · ${classLabel(user.classLevel, user.organisation)}` : user.organisation ? ` · ${user.organisation}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LevelBadge level={user.autonomyLevel} />
              {sheetNumber && <span className="rounded-lg border border-border px-2 py-1 font-mono text-xs font-bold">{sheetNumber}</span>}
            </div>
            <ul className="mt-4 space-y-2 text-base text-muted-foreground">
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> Identifiant : <b>{user.username ?? user.email}</b></li>
              {user.phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {user.phone}</li>}
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Membre depuis le {fmtDate(user.createdAt)}</li>
            </ul>
            {manager && manager.phone && (
              <div className="mt-4 rounded-xl bg-muted/60 p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Contacter le responsable</p>
                <p className="mt-1 text-sm font-semibold">{manager.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{manager.phone}</span>
                  <ContactButtons phone={manager.phone} email={manager.email} compact />
                </p>
              </div>
            )}
            <OfflineLogoutButton className={buttonClass("outline", "md", "w-full")}>Se déconnecter</OfflineLogoutButton>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader
            title="Niveaux d'autonomie par machine"
            subtitle={`${unlocked}/${machines.length} machines accessibles. Les niveaux sont débloqués progressivement par le FabManager après une formation ou une évaluation.`}
          />
          <CardContent>
            <ul className="divide-y divide-border">
              {machines.map((m) => {
                const s = skills.find((k) => k.resourceId === m.id);
                const lvl = s ? maxLevel(user.autonomyLevel, s.level) : user.autonomyLevel;
                const ok = levelAllows(lvl, m.requiredLevel);
                return (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted"><ResourceIcon icon={m.icon} className="h-5 w-5" /></span>
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-sm text-muted-foreground">Requis : {LEVEL_LABEL[m.requiredLevel]} · Votre niveau : {LEVEL_LABEL[lvl]}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium ${ok ? "bg-togo-green/15 text-togo-green dark:text-emerald-300" : "bg-togo-red/10 text-togo-red"}`}>
                      {ok ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      {ok ? "Accès autorisé" : "Verrouillée"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {isStudent && gradeRows.length > 0 && stats && (
        <Card>
          <CardHeader
            eyebrow={rank ? `Fiche ${sheetNumber} · classe ${rank.code} · n° ${rank.rank} sur ${rank.total}` : "Suivi"}
            title="Mon suivi pédagogique"
            subtitle={`${stats.notes} note(s) et ${stats.observations} observation(s) · moyenne ${stats.moyenne == null ? "—" : stats.moyenne.toFixed(1) + "/20"}`}
          />
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-border text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="py-3 pr-3">Date</th>
                  <th className="py-3 pr-3">Intitulé</th>
                  <th className="py-3 pr-3">Note</th>
                  <th className="py-3 pr-3">Par</th>
                </tr>
              </thead>
              <tbody>{gradeRows.map((g) => <GradeRow key={g.id} g={g} />)}</tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
