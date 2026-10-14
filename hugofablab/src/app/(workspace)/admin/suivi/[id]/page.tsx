import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, eq, ne } from "drizzle-orm";
import { ArrowLeft, BookOpenCheck, Printer, TrendingUp } from "lucide-react";
import { GradeForm, GradeRow } from "@/components/admin/grade-form";
import { Badge, Card, CardContent, CardHeader, EmptyState, LevelBadge, PageHeader, Stat, buttonClass } from "@/components/ui";
import { db } from "@/db";
import { reservations, resources, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { LEVEL_LABEL, classLabel } from "@/lib/labels";
import { assignSheetNumber, classRank, gradesStats, listGrades } from "@/lib/pedagogy";

export const metadata: Metadata = { title: "Suivi d'un apprenant" };
export const dynamic = "force-dynamic";

export default async function PedagogyLearnerPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [learner] = await db.select().from(users).where(eq(users.id, Number(id))).limit(1);
  if (!learner || learner.labId !== admin.labId) notFound();

  const sheetNumber = await assignSheetNumber(learner);
  const [rank, stats, grades, [{ n: resaCount }], [{ n: present }]] = await Promise.all([
    classRank(learner),
    gradesStats(learner.id),
    listGrades(learner.id),
    db.select({ n: count() }).from(reservations).innerJoin(resources, eq(reservations.resourceId, resources.id)).where(and(eq(reservations.userId, learner.id), eq(resources.labId, admin.labId))),
    db.select({ n: count() }).from(reservations).where(and(eq(reservations.userId, learner.id), ne(reservations.status, "annulee"))),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/admin/suivi" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-togo-green dark:hover:text-lime">
        <ArrowLeft className="h-4 w-4" /> Suivi pédagogique
      </Link>
      <PageHeader
        eyebrow={`Fiche ${sheetNumber ?? "—"}${rank ? ` · classe ${rank.code} · n° ${rank.rank} sur ${rank.total}` : ""}`}
        title={learner.name}
        subtitle={`${learner.classLevel ? classLabel(learner.classLevel, learner.organisation) : learner.organisation ?? "Sans classe"} · identifiant ${learner.username ?? "—"} · ${LEVEL_LABEL[learner.autonomyLevel]}`}
        action={
          <a href={`/print/apprenant/${learner.id}`} target="_blank" rel="noreferrer" className={buttonClass("primary", "md")}>
            <Printer className="h-4 w-4" /> Imprimer la fiche
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Moyenne générale" value={stats.moyenne == null ? "—" : stats.moyenne.toFixed(1)} hint="sur 20, toutes notes" accent={stats.moyenne != null && stats.moyenne >= 10 ? "green" : "red"} />
        <Stat label="Notes" value={stats.notes} hint="évaluations chiffrées" accent="neutral" />
        <Stat label="Observations" value={stats.observations} hint="appréciations écrites" accent="yellow" />
        <Stat label="Réservations" value={resaCount} hint={`${present} à venir ou réalisées`} accent="green" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader
            eyebrow="Évaluations"
            title="Notes et observations"
            subtitle="Saisies par le responsable du lab ; visibles par l'apprenant."
            action={learner.sheetNumber ? null : <Badge tone="yellow">N° de fiche attribué à l'ouverture</Badge>}
          />
          <CardContent className="overflow-x-auto">
            {grades.length === 0 ? (
              <EmptyState icon={<BookOpenCheck className="h-7 w-7" />} title="Aucune évaluation" text="Ajoutez la première note ou observation ci-contre." />
            ) : (
              <table className="w-full min-w-[540px] text-left text-[15px]">
                <thead>
                  <tr className="border-b border-border text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="py-3 pr-3">Date</th>
                    <th className="py-3 pr-3">Intitulé</th>
                    <th className="py-3 pr-3">Note</th>
                    <th className="py-3 pr-3">Par</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>{grades.map((g) => <GradeRow key={g.id} g={g} onDelete />)}</tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader eyebrow="Nouvelle évaluation" title="Ajouter au suivi" subtitle="Une note sur n, ou une observation écrite (comportement, régularité, progrès)." />
          <CardContent>
            <GradeForm learnerId={learner.id} />
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-[13px] leading-6 text-muted-foreground">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-togo-green dark:text-lime" />
              <span>
                {stats.best != null && stats.worst != null ? `Meilleure note ${stats.best.toFixed(1)}/20 · la plus faible ${stats.worst.toFixed(1)}/20. ` : ""}
                Toutes ces valeurs figurent sur la fiche imprimable de l&apos;apprenant.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
