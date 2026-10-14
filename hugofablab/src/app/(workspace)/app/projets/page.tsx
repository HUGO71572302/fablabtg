import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { ProjectActions } from "@/components/projects/project-actions";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectForm } from "@/components/projects/project-form";
import { Card, CardContent, CardHeader, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLab } from "@/lib/labs";

export const metadata: Metadata = { title: "Projets" };
export const dynamic = "force-dynamic";

export default async function StudentProjectsPage() {
  const user = await requireUser();
  const [mine, gallery, lab] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.labId, user.labId), eq(projects.submittedBy, user.id))).orderBy(desc(projects.createdAt)),
    db.select().from(projects).where(and(eq(projects.labId, user.labId), eq(projects.published, true))).orderBy(desc(projects.createdAt)).limit(6),
    getLab(user.labId),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader
        title="Projets"
        subtitle="Partagez ce que vous avez fabriqué au FabLab : après validation, votre projet apparaît dans la galerie publique."
        action={lab ? <Link href={`/lab/${lab.slug}#projets`} className={buttonClass("outline", "md")}><ExternalLink className="h-4 w-4" /> Galerie du lab</Link> : null}
      />
      <Card>
        <CardHeader title="Proposer un projet" />
        <CardContent>
          <ProjectForm isAdmin={user.role === "fabmanager"} defaultAuthors={user.name} defaultClass={user.classLevel} />
        </CardContent>
      </Card>
      <section className="space-y-3">
        <h2 className="font-semibold">Mes projets</h2>
        {mine.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((p) => <ProjectCard key={p.id} p={p} showStatus actions={!p.published ? <ProjectActions id={p.id} published={false} canPublish={false} /> : null} />)}
          </div>
        ) : (
          <EmptyState title="Vous n'avez encore proposé aucun projet" />
        )}
      </section>
      {gallery.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Dernières réalisations du lab</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((p) => <ProjectCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
