import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { MessageSquareQuote, Star } from "lucide-react";
import { db } from "@/db";
import { userReviews, users } from "@/db/schema";
import { ReviewControls } from "@/components/reviews/review-controls";
import { Badge, Card, CardContent, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { fmtDateCompact } from "@/lib/dates";

export const metadata: Metadata = { title: "Avis des utilisateurs" };
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const admin = await requireAdmin();
  const reviews = await db.select({ review: userReviews, name: users.name, role: users.role, username: users.username })
    .from(userReviews).innerJoin(users, eq(userReviews.userId, users.id))
    .where(eq(userReviews.labId, admin.labId))
    .orderBy(desc(userReviews.published), desc(userReviews.featured), desc(userReviews.createdAt));
  const pending = reviews.filter(({ review }) => !review.published).length;
  const published = reviews.filter(({ review }) => review.published).length;
  const average = published ? reviews.filter(({ review }) => review.published).reduce((sum, { review }) => sum + review.rating, 0) / published : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Communauté" title="Avis des utilisateurs" subtitle="Lisez les retours des membres, puis choisissez ceux qui apparaissent dans leur espace." />
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-togo-yellow/35 bg-gradient-to-br from-togo-yellow/20 to-card p-4"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">À examiner</p><p className="mt-2 font-display text-3xl font-black">{pending}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Publiés</p><p className="mt-2 font-display text-3xl font-black">{published}</p></div>
        <div className="col-span-2 rounded-2xl border border-togo-green/20 bg-togo-green/5 p-4 sm:col-span-1"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Note moyenne</p><p className="mt-2 flex items-center gap-2 font-display text-3xl font-black">{published ? average.toFixed(1) : "—"}<Star className="h-6 w-6 fill-amber-400 text-amber-500" /></p></div>
      </section>

      {reviews.length ? (
        <ul className="space-y-4">
          {reviews.map(({ review, name, role, username }) => (
            <li key={review.id}>
              <Card className={review.published ? "border-togo-green/20" : "border-togo-yellow/50 shadow-md shadow-togo-yellow/5"}>
                <CardContent>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold">{name}</h2><Badge tone={role === "external" ? "yellow" : "green"}>{role === "external" ? "Externe" : "Élève"}</Badge><Badge tone={review.published ? "green" : "yellow"}>{review.published ? "Publié" : "À valider"}</Badge>{review.featured && <Badge tone="blue"><Star className="h-3 w-3 fill-current" /> Mis en avant</Badge>}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{username ? `@${username} · ` : ""}{fmtDateCompact(review.createdAt)}{review.updatedAt > review.createdAt ? " · modifié" : ""}</p>
                    </div>
                    <div className="flex items-center gap-0.5" aria-label={`${review.rating} sur 5 étoiles`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-5 w-5 ${n <= review.rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground/30"}`} />)}</div>
                  </div>
                  <blockquote className="mt-4 whitespace-pre-wrap rounded-xl bg-muted/60 p-4 text-[15px] leading-relaxed">{review.message}</blockquote>
                  <div className="mt-4"><ReviewControls id={review.id} published={review.published} featured={review.featured} /></div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card><CardContent className="py-12 text-center"><MessageSquareQuote className="mx-auto h-10 w-10 text-togo-green dark:text-lime" /><h2 className="mt-3 text-lg font-extrabold">Aucun avis pour le moment</h2><p className="mt-1 text-sm text-muted-foreground">Les nouveaux retours des membres apparaîtront ici.</p></CardContent></Card>
      )}
    </div>
  );
}
