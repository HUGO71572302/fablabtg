import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Cpu, GraduationCap, Lightbulb, MessageSquareQuote, MonitorSmartphone, Printer, School, ShieldCheck, Sparkles, Star, Wrench } from "lucide-react";
import { db } from "@/db";
import { labs, projects, userReviews, users } from "@/db/schema";
import { PublicHeader } from "@/components/layout/public-header";
import { Faq } from "@/components/marketing/faq";
import { LabDirectory } from "@/components/marketing/lab-directory";
import { SectionHeading } from "@/components/marketing/section-heading";
import { CountUp, Marquee, MaskLine, Reveal, Stagger } from "@/components/motion";
import { ProjectCard } from "@/components/projects/project-card";
import { buttonClass } from "@/components/ui";
import { SITE } from "@/config/site";
import { getCurrentUser } from "@/lib/auth";
import { listLabs } from "@/lib/labs";
import { mediaUrl } from "@/lib/media-url";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [user, labsList, recentProjects, publicReviews] = await Promise.all([
    getCurrentUser(),
    listLabs(),
    db.select({ project: projects, slug: labs.slug, labName: labs.name }).from(projects).innerJoin(labs, eq(projects.labId, labs.id)).where(and(eq(projects.published, true), eq(labs.active, true))).orderBy(desc(projects.createdAt)).limit(3),
    db.select({ review: userReviews, author: users.name, labSlug: labs.slug, labName: labs.name, schoolName: labs.schoolName })
      .from(userReviews)
      .innerJoin(users, eq(userReviews.userId, users.id))
      .innerJoin(labs, eq(userReviews.labId, labs.id))
      .where(and(eq(userReviews.published, true), eq(labs.active, true), eq(users.active, true)))
      .orderBy(desc(userReviews.featured), desc(userReviews.createdAt))
      .limit(6),
  ]);
  const appHref = user ? (user.role === "fabmanager" ? "/admin" : "/app") : null;
  const machines = labsList.reduce((sum, l) => sum + l.machines, 0);
  const students = labsList.reduce((sum, l) => sum + l.students, 0);
  const directory = labsList.map((l) => ({ id: l.id, slug: l.slug, name: l.name, school: l.schoolName, city: l.city, region: l.region, coverUrl: mediaUrl(l.coverId, "/images/workshop.jpg")!, logoUrl: mediaUrl(l.logoId), machines: l.machines, students: l.students, projects: l.projects }));
  const projectLabSlug = recentProjects[0]?.slug ?? labsList[0]?.slug;

  return (
    <>
      <PublicHeader appHref={appHref} />
      <main>
        {/* ── 00 · Hero ── */}
        <section className="site-container relative pb-12 pt-10 sm:pb-16 sm:pt-14 lg:pt-[64px]" aria-labelledby="hero-title">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.02fr] lg:gap-14">
            <Reveal variant="group" className="landing-hero-copy">
              <p className="eyebrow text-togo-green dark:text-lime"><MaskLine>Créer. Expérimenter. Transmettre.</MaskLine></p>
              <h1 id="hero-title" className="display-text mt-6 text-[clamp(2.5rem,12vw,3.05rem)] sm:text-[65px] lg:text-[72px] xl:text-[77px]">
                <MaskLine className="[--line:0]">Le futur</MaskLine>
                <MaskLine className="[--line:1]">se fabrique</MaskLine>
                <MaskLine className="[--line:2]">
                  <span className="relative inline-block text-togo-green dark:text-lime">
                    à l&apos;école.
                    <svg viewBox="0 0 310 14" preserveAspectRatio="none" className="absolute -bottom-3 left-0 h-3 w-full text-togo-yellow" aria-hidden="true"><path d="M3 9C76 1 190 0 306 8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg>
                  </span>
                </MaskLine>
              </h1>
              <Reveal delay={80} className="mt-6 max-w-[390px] text-base leading-[1.75] text-muted-foreground sm:mt-8 sm:leading-[1.85]" as="p">
                Des idées aux objets, un atelier pour révéler les talents. Rejoignez le réseau des FabLabs scolaires, <strong className="font-medium text-foreground">de la 6e à la Terminale.</strong>
              </Reveal>
              <Reveal delay={140} className="mt-6 flex flex-col items-stretch gap-3 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center">
                <Link href={appHref ?? "/register"} className={buttonClass("primary", "lg", "w-full sm:w-auto")}>{appHref ? "Retrouver mon espace" : "Je rejoins mon lab"}<ArrowUpRight className="h-4 w-4" /></Link>
                <Link href="/creer-mon-lab" className={buttonClass("outline", "lg", "w-full sm:w-auto")}>Je crée mon lab<ArrowRight className="h-4 w-4" /></Link>
              </Reveal>
              <Reveal delay={220} className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground sm:mt-7">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-togo-green/10 text-togo-green dark:text-lime"><Check className="h-3 w-3" /></span><span>Sans e-mail pour les élèves</span><span className="mx-1 hidden h-1 w-1 rounded-full bg-border sm:inline-block" /><span>Sur mobile &amp; ordinateur</span>
              </Reveal>
            </Reveal>

            <div className="relative mx-1 pb-7 sm:mx-4 lg:mx-0">
              <Reveal variant="scale" delay={200} className="absolute -right-5 -top-5 h-40 w-40 rounded-full border border-togo-green/15 sm:h-56 sm:w-56" />
              <Reveal variant="right" delay={320} className="absolute -bottom-1 -left-7 h-32 w-44 rounded-[24px] bg-lime/65 dark:bg-lime/10 sm:h-44 sm:w-64" />
              <Reveal variant="clip" delay={120} className="parallax relative overflow-hidden rounded-[24px] sm:rounded-[30px]">
                <img src="/images/makers-hero.jpg" data-gallery="atelier" alt="Illustration d'élèves togolais découvrant ensemble l'impression 3D dans un atelier scolaire" width={1536} height={1024} fetchPriority="high" className="h-[340px] w-full object-cover object-[57%_center] sm:h-[440px] lg:h-[468px]" />
                <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-forest/60 to-transparent" />
                <span className="absolute bottom-3 right-4 text-[13px] text-white/75">Visuel d’illustration</span>
                <div className="absolute bottom-6 left-6 text-white"><span className="block text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">L&apos;apprentissage en action</span><p className="mt-2 font-display text-[21px] font-bold tracking-tight">Une idée. Mille possibilités.</p></div>
                <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-forest"><Sparkles className="h-4 w-4" /></span>
              </Reveal>
              <Reveal variant="up" delay={700} className="surface-shadow absolute -right-2 bottom-0 flex items-center gap-3 rounded-[16px] border border-border bg-card px-4 py-3 sm:-right-5 sm:px-5 sm:py-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-forest"><GraduationCap className="h-5 w-5" /></span>
                <div><p className="font-display text-base font-extrabold">Petits makers, grandes idées.</p><p className="mt-0.5 text-[13px] text-muted-foreground">Tous les niveaux. Un même élan.</p></div>
              </Reveal>
              <Reveal variant="left" delay={820} className="absolute -left-6 top-8 hidden items-center gap-2 rounded-full border border-white/70 bg-white px-3 py-2 text-[13px] font-semibold text-forest shadow-sm sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-togo-green" />Pensé pour nos écoles
              </Reveal>
            </div>
          </div>
          <div className="scroll-cue-wrap mt-10 hidden justify-center lg:flex" aria-hidden="true">
            <span className="scroll-cue inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"><ArrowDown className="h-3.5 w-3.5" />Découvrir</span>
          </div>
        </section>

        {/* ── Bandeau défilant ── */}
        <div className="border-y border-border/70 bg-forest py-4 font-display text-[15px] font-bold uppercase tracking-[0.14em] text-lime/90">
          <Marquee items={[...SITE.marquee]} />
        </div>

        {/* ── Chiffres clés ── */}
        <section className="border-b border-border/70 bg-card/40" aria-label="Le réseau en chiffres">
          <div className="site-container grid grid-cols-2 gap-y-6 py-7 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:py-8">
            <Reveal variant="right" className="col-span-2 flex items-center gap-3 md:col-span-1">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-muted"><School className="h-4.5 w-4.5 text-togo-green dark:text-lime" /></span>
              <p className="text-[15px] font-medium leading-5">Un réseau qui grandit.<br /><span className="text-muted-foreground">Un élève à la fois.</span></p>
            </Reveal>
            <Stagger from={1}>
              {[{ n: labsList.length, l: "FabLabs dans le réseau" }, { n: machines, l: "machines à explorer" }, { n: students, l: "élèves inscrits" }].map((s, i) => (
                <Reveal key={s.l} className={`flex items-center gap-3 ${i === 2 ? "col-span-2 md:col-span-1" : ""} md:border-l md:border-border md:pl-8`}>
                  <CountUp value={s.n} className="font-display text-[30px] font-extrabold tabular-nums tracking-tight text-togo-green dark:text-lime" />
                  <span className="max-w-[100px] text-[13px] leading-4 text-muted-foreground">{s.l}</span>
                </Reveal>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ── 01 · Explorer ── */}
        <section id="explorer" className="site-container section" aria-labelledby="explorer-title">
          <SectionHeading index="01" eyebrow="Le terrain de jeu des idées" title={<span id="explorer-title">Tout commence par un « et si… »</span>} lead="Toucher, tester, comprendre. Les technologies de demain deviennent les outils d’aujourd’hui." />
          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_0.78fr]">
            <Reveal variant="clip" className="image-zoom parallax rounded-[22px]"><Link href="/#labs" className="group relative block min-h-[225px] overflow-hidden rounded-[22px] bg-forest sm:min-h-[270px]">
              <img src="/images/real-1.jpg" data-gallery="atelier" alt="Prototypes imprimés en 3D et projets robotiques réalisés par des élèves" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
              <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-forest">01 / FABRICATION NUMÉRIQUE</span>
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-2 text-white"><div><Printer className="mb-2 h-5 w-5 text-lime" /><h3 className="text-2xl font-extrabold tracking-tight">Imaginer. Imprimer.</h3><p className="mt-1 text-[13px] text-white/70">De la modélisation à la première pièce.</p></div><ArrowUpRight className="h-5 w-5 shrink-0 transition group-hover:-translate-y-1 group-hover:translate-x-1" /></div>
            </Link></Reveal>
            <Reveal variant="clip" delay={120} className="image-zoom parallax rounded-[22px]"><Link href="/#labs" className="group relative block min-h-[225px] overflow-hidden rounded-[22px] bg-forest sm:min-h-[270px]">
              <img src="/images/electronics-detail.jpg" data-gallery="atelier" alt="Illustration de mains d'élèves assemblant un projet électronique" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-forest">02 / ÉLECTRONIQUE &amp; ROBOTIQUE</span>
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-2 text-white"><div><Cpu className="mb-2 h-5 w-5 text-togo-yellow" /><h3 className="text-2xl font-extrabold tracking-tight">Brancher sa curiosité.</h3><p className="mt-1 text-[13px] text-white/70">Un circuit, un capteur, un premier robot.</p></div><ArrowUpRight className="h-5 w-5 shrink-0 transition group-hover:-translate-y-1 group-hover:translate-x-1" /></div>
            </Link></Reveal>
            <Reveal variant="scale" delay={240} className="relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-[22px] bg-lime p-6 text-forest">
              <span className="text-[13px] font-semibold uppercase tracking-[0.14em]">Et surtout…</span>
              <Lightbulb className="absolute -right-3 top-5 h-28 w-28 rotate-[-15deg] stroke-[0.7] opacity-20" />
              <div className="relative mt-8"><h3 className="font-display text-[26px] font-extrabold leading-[1.1] tracking-tight">Le droit<br />d&apos;essayer.</h3><p className="mt-3 max-w-[180px] text-[13px] leading-5 text-forest/80">Parce qu&apos;on apprend aussi en recommençant.</p></div>
            </Reveal>
          </div>
        </section>

        {/* ── 02 · Les labs ── */}
        <section id="labs" className="site-container pb-[var(--section-y)]" aria-labelledby="labs-title">
          <SectionHeading index="02" eyebrow="Un atelier près de vous" title={<span id="labs-title">Trouvez votre FabLab.</span>} lead="Des lieux pour se rencontrer, expérimenter et faire ensemble." action={<a href="/creer-mon-lab" className="inline-flex items-center gap-2 text-[13px] font-semibold text-togo-green dark:text-lime">Et si votre école rejoignait le réseau ?<ArrowUpRight className="h-4 w-4" /></a>} />
          <Reveal delay={120}><LabDirectory labs={directory} /></Reveal>
        </section>

        {/* ── 03 · Fonctionnement ── */}
        <section id="fonctionnement" className="bg-forest text-white" aria-labelledby="steps-title">
          <div className="site-container section">
            <SectionHeading tone="inverted" index="03" eyebrow="Moins de paperasse. Plus de création." title={<span id="steps-title">De l&apos;idée à l&apos;atelier, en trois petits pas.</span>} action={<Link href="/creer-mon-lab" className={buttonClass("warning", "lg", "text-[15px]")}>Lancer mon FabLab<ArrowUpRight className="h-4 w-4" /></Link>} />
            <div className="grid gap-7 md:grid-cols-3">
              {[{ n: "01", icon: School, t: "Un lab à votre image.", d: "Le responsable choisit son nom, ses photos et ses machines. Un espace unique pour chaque école." }, { n: "02", icon: GraduationCap, t: "Une inscription toute simple.", d: "L'élève choisit son identifiant et son PIN. Pas d'e-mail : juste l'envie de rejoindre l'atelier." }, { n: "03", icon: Wrench, t: "Une place pour vos idées.", d: "Réservez une machine, recevez la validation et venez fabriquer. Partagez ensuite votre réalisation." }].map((s, i) => (
                <div key={s.n}>
                  <Reveal variant="line" index={i} className="h-px w-full text-white/70" />
                  <Reveal index={i} delay={200} className="pt-5">
                    <div className="flex items-center justify-between"><span className="font-mono text-[13px] text-white/70">ÉTAPE {s.n}</span><s.icon className="h-5 w-5 text-lime" /></div>
                    <h3 className="mt-6 text-[18px] font-bold tracking-tight">{s.t}</h3>
                    <p className="mt-3 max-w-[300px] text-sm leading-6 text-white/70">{s.d}</p>
                  </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 04 · Projets ── */}
        {recentProjects.length > 0 && (
          <section id="projets" className="site-container section" aria-labelledby="projects-title">
            <SectionHeading index="04" eyebrow="Ils l’ont imaginé. Ils l’ont fabriqué." title={<span id="projects-title">Les talents prennent forme.</span>} lead="Découvrez les projets publiés dans nos ateliers." action={projectLabSlug && <Link href={`/lab/${projectLabSlug}#projets`} className={buttonClass("outline", "md", "text-[13px]")}>Explorer la galerie<ArrowUpRight className="h-4 w-4" /></Link>} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Stagger>
                {recentProjects.map(({ project, slug, labName }) => (
                  <Reveal key={project.id} variant="up">
                    <ProjectCard p={project} />
                    <Link href={`/lab/${slug}#projets`} className="mt-3 flex items-center gap-1.5 pl-1 text-[13px] font-medium text-muted-foreground hover:text-togo-green">{labName}<ArrowUpRight className="h-3 w-3" /></Link>
                  </Reveal>
                ))}
              </Stagger>
            </div>
          </section>
        )}

        {/* ── 05 · Avis publiés ── */}
        {publicReviews.length > 0 && (
          <section id="avis" className="site-container section" aria-labelledby="reviews-title">
            <SectionHeading index="05" eyebrow="La communauté témoigne" title={<span id="reviews-title">Ils fabriquent. Ils racontent.</span>} lead="Les avis publiés par les responsables des FabLabs du réseau." />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {publicReviews.map(({ review, author, labSlug, labName, schoolName }, index) => (
                <Reveal key={review.id} variant="up" delay={index * 70}>
                  <article className={`relative flex h-full flex-col overflow-hidden rounded-[22px] border p-5 sm:p-6 ${review.featured ? "border-togo-yellow/50 bg-gradient-to-br from-togo-yellow/15 via-card to-card shadow-md" : "border-border bg-card"}`}>
                    {review.featured && <span className="absolute right-4 top-4 rounded-full bg-togo-yellow/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800 dark:text-togo-yellow">À la une</span>}
                    <div className="flex items-center gap-1" aria-label={`${review.rating} sur 5 étoiles`}>
                      {[1, 2, 3, 4, 5].map((value) => <Star key={value} className={`h-4 w-4 ${value <= review.rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground/30"}`} />)}
                    </div>
                    <MessageSquareQuote className="mt-4 h-6 w-6 text-togo-green/50 dark:text-lime/70" aria-hidden="true" />
                    <blockquote className="mt-2 flex-1 text-[15px] font-medium leading-7 text-foreground">{review.message}</blockquote>
                    <div className="mt-5 border-t border-border/70 pt-4">
                      <p className="font-bold">{author}</p>
                      <Link href={`/lab/${labSlug}`} className="mt-1 inline-flex items-center gap-1 text-[13px] text-muted-foreground transition hover:text-togo-green dark:hover:text-lime">{labName} · {schoolName}<ArrowUpRight className="h-3 w-3 shrink-0" /></Link>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* ── 06 · FAQ ── */}
        <section className="site-container pb-[var(--section-y)]" aria-labelledby="faq-title">
          <div className="grid gap-8 border-t border-border pt-12 lg:grid-cols-[0.85fr_1.3fr]">
            <Reveal variant="group" className="lg:sticky-label lg:self-start">
              <p className="eyebrow text-muted-foreground"><span className="mr-2 font-mono text-[13px] tracking-normal">06</span>On vous répond</p>
              <h2 id="faq-title" className="section-title mt-4"><MaskLine>Simple, jusque</MaskLine><MaskLine className="[--line:1]">dans les détails.</MaskLine></h2>
              <p className="mt-4 max-w-[270px] text-sm leading-6 text-muted-foreground">Un atelier accueillant commence par une application facile à utiliser.</p>
              <div className="mt-6 flex gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-togo-green dark:text-lime"><MonitorSmartphone className="h-5 w-5" /></span><span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-togo-green dark:text-lime"><ShieldCheck className="h-5 w-5" /></span></div>
            </Reveal>
            <Reveal variant="blur" delay={150}><Faq /></Reveal>
          </div>
        </section>

        {/* ── Appel final ── */}
        <section className="site-container pb-16">
          <Reveal variant="scale" className="relative overflow-hidden rounded-[26px] bg-lime px-6 py-10 text-forest sm:px-12 sm:py-12">
            <div className="absolute -right-14 -top-14 h-64 w-64 rounded-full border border-forest/10" />
            <div className="absolute -bottom-20 right-16 h-64 w-64 rounded-full border border-forest/10" />
            <div className="relative flex flex-wrap items-center justify-between gap-8">
              <div><p className="text-[13px] font-semibold uppercase tracking-[0.16em]">Le prochain grand projet commence ici.</p><h2 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-[-0.05em] sm:text-[40px]">Et si on fabriquait<br />l&apos;avenir ensemble ?</h2></div>
              <div className="space-y-3"><Link href={appHref ?? "/register"} className={buttonClass("primary", "lg", "bg-forest text-white dark:bg-forest dark:text-white")}>{appHref ? "Retrouver mon lab" : "Rejoindre mon FabLab"}<ArrowUpRight className="h-4 w-4" /></Link><p className="text-[13px] text-forest/80">Un identifiant. Un PIN. Tout un monde à explorer.</p></div>
            </div>
          </Reveal>
        </section>
      </main>
    </>
  );
}
