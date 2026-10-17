import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { MessageSquareQuote, Star } from "lucide-react";
import { db } from "@/db";
import { userReviews, users } from "@/db/schema";
import { ReviewForm } from "@/components/reviews/review-form";
import { Card, CardContent, CardHeader, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDateCompact } from "@/lib/dates";

export const metadata: Metadata = { title: "Avis des utilisateurs" };
export const dynamic = "force-dynamic";

function Rating({ value }: { value: number }) {
  return <div className="flex items-center gap-0.5" aria-label={`${value} sur 5 étoiles`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-4 w-4 ${n <= value ? "fill-amber-400 text-amber-500" : "text-muted-foreground/30"}`} />)}</div>;
}

export default async function ReviewsPage() {
  const user = await requireUser();
  if (user.role === "fabmanager") return null;
  const [own, reviews] = await Promise.all([
    db.select().from(userReviews).where(and(eq(userReviews.labId, user.labId), eq(userReviews.userId, user.id))).limit(1),
    db.select({ review: userReviews, name: users.name, role: users.role })
      .from(userReviews).innerJoin(users, eq(userReviews.userId, users.id))
      .where(and(eq(userReviews.labId, user.labId), eq(userReviews.published, true)))
      .orderBy(desc(userReviews.featured), desc(userReviews.createdAt)).limit(50),
  ]);
  const average = reviews.length ? reviews.reduce((sum, { review }) => sum + review.rating, 0) / reviews.length : 0;
  const featured = reviews.filter(({ review }) => review.featured);
  const featuredShown = featured.slice(0, 2);
  const otherReviews = reviews.filter(({ review }) => !featuredShown.some((item) => item.review.id === review.id));

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-forest px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
        <div className="absolute -right-10 -top-16 -z-10 h-64 w-64 rounded-full bg-lime/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 -z-10 h-40 w-2/3 bg-gradient-to-l from-togo-green/40 to-transparent" />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-lime"><MessageSquareQuote className="h-4 w-4" /> La communauté s’exprime</div>
            <h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">Avis des utilisateurs</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">Vos expériences font grandir le FabLab. Découvrez les retours des membres et partagez le vôtre.</p>
          </div>
          <div className="min-w-36 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2"><Star className="h-6 w-6 fill-amber-400 text-amber-400" /><span className="font-display text-3xl font-black">{reviews.length ? average.toFixed(1) : "—"}</span></div>
            <p className="mt-1 text-sm text-white/70">{reviews.length} avis publié{reviews.length > 1 ? "s" : ""}</p>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section aria-label="Avis mis en avant" className="grid gap-4 md:grid-cols-2">
          {featuredShown.map(({ review, name }, index) => (
            <article key={review.id} className={`relative overflow-hidden rounded-[22px] border p-5 sm:p-6 ${index === 0 ? "border-togo-yellow/50 bg-gradient-to-br from-togo-yellow/15 via-card to-card" : "border-togo-green/20 bg-card"}`}>
              <div className="absolute right-4 top-2 font-serif text-7xl leading-none text-togo-yellow/30" aria-hidden>“</div>
              <Rating value={review.rating} />
              <blockquote className="relative mt-4 text-lg font-semibold leading-relaxed">{review.message}</blockquote>
              <p className="mt-5 text-sm font-bold">{name} <span className="font-normal text-muted-foreground">· {fmtDateCompact(review.createdAt)}</span></p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-togo-green dark:text-lime">Avis mis en avant</p>
            </article>
          ))}
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_0.92fr]">
        <Card className="overflow-hidden">
          <CardHeader title="Les retours de la communauté" subtitle="Les avis sont publiés après vérification par le responsable du FabLab." />
          <CardContent>
            {reviews.length ? (
              <ul className="space-y-3">
                {otherReviews.map(({ review, name }) => (
                  <li key={review.id} className="rounded-2xl border border-border bg-background/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{name}</p><Rating value={review.rating} /></div>
                    <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">{review.message}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{fmtDateCompact(review.createdAt)}</p>
                  </li>
                ))}
                {!otherReviews.length && <li className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">Les avis mis en avant sont présentés juste au-dessus.</li>}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center"><MessageSquareQuote className="mx-auto h-9 w-9 text-togo-green dark:text-lime" /><p className="mt-3 font-bold">Les premiers avis arrivent bientôt</p><p className="mt-1 text-sm text-muted-foreground">Soyez le premier à raconter votre expérience au FabLab.</p></div>
            )}
          </CardContent>
        </Card>

        <Card className="border-togo-green/25 shadow-lg shadow-togo-green/5">
          <CardHeader eyebrow="Votre expérience compte" title={own.length ? "Modifier mon avis" : "Donner mon avis"} subtitle="Dites-nous ce qui fonctionne bien et ce que nous pouvons améliorer." />
          <CardContent>
            {own[0] && <p className="mb-4 rounded-xl bg-togo-yellow/15 px-3 py-2 text-sm text-muted-foreground">Votre avis actuel : {own[0].published ? "publié" : "en attente de validation"}. Toute modification devra être validée de nouveau.</p>}
            <ReviewForm initialRating={own[0]?.rating ?? 5} initialMessage={own[0]?.message ?? ""} isUpdate={Boolean(own[0])} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
