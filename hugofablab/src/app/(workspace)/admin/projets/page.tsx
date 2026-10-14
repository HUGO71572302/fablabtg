import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { ProjectActions } from "@/components/projects/project-actions";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectEditButton } from "@/components/projects/project-edit-button";
import { ProjectForm } from "@/components/projects/project-form";
import { Card, CardContent, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { mediaUrl } from "@/lib/media-url";

export const metadata: Metadata = { title: "Projets des élèves" };
export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const admin = await requireAdmin();
  const [pending, published] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.labId, admin.labId), eq(projects.published, false))).orderBy(desc(projects.createdAt)),
    db.select().from(projects).where(and(eq(projects.labId, admin.labId), eq(projects.published, true))).orderBy(desc(projects.createdAt)),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader title="Projets réalisés" subtitle="Publiez les réalisations des élèves dans la galerie de la vitrine publique du lab." />
      <Card>
        <CardHeader title="Ajouter un projet" subtitle="Photo obligatoire ; publié immédiatement dans la galerie." />
        <CardContent>
          <ProjectForm isAdmin />
        </CardContent>
      </Card>
      <section className="space-y-3">
        <h2 className="font-semibold">Propositions des élèves à valider <span className="text-base font-normal text-muted-foreground">({pending.length})</span></h2>
        {pending.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((p) => <ProjectCard key={p.id} p={p} showStatus actions={<ProjectActions id={p.id} published={false} canPublish />} />)}
          </div>
        ) : (
          <EmptyState title="Aucune proposition en attente" text="Les élèves peuvent proposer leurs projets depuis leur espace (menu Projets)." />
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Galerie publiée <span className="text-base font-normal text-muted-foreground">({published.length})</span></h2>
        {published.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {published.map((p) => (
              <ProjectCard
                key={p.id}
                p={p}
                actions={
                  <>
                    <ProjectEditButton project={{ id: p.id, title: p.title, description: p.description, authors: p.authors, classLevel: p.classLevel, machines: p.machines, photoUrl: mediaUrl(p.photoId, p.imageUrl) }} />
                    <ProjectActions id={p.id} published canPublish />
                  </>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Galerie vide" />
        )}
      </section>
    </div>
  );
}
