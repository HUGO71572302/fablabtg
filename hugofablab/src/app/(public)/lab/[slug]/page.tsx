import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq } from "drizzle-orm";
import { ArrowLeft, ArrowUpRight, CalendarCheck2, Check, Clock3, Expand, GraduationCap, Images, Mail, MapPin, Phone, Wrench } from "lucide-react";
import { db } from "@/db";
import { projects, users } from "@/db/schema";
import { BrandMark } from "@/components/brand/logo";
import { ProjectCard } from "@/components/projects/project-card";
import { PublicHeader } from "@/components/layout/public-header";
import { CountUp, MaskLine, Reveal, Stagger } from "@/components/motion";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { EmptyState, LevelBadge, ResourceStatusBadge, buttonClass } from "@/components/ui";
import { ContactButtons } from "@/components/ui/contact";
import { getCurrentUser } from "@/lib/auth";
import { DAY_NAMES } from "@/lib/dates";
import { getLabBySlug } from "@/lib/labs";
import { mediaUrl } from "@/lib/media-url";
import { getSettings, listResourcesWithRooms } from "@/lib/reservations";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lab = await getLabBySlug((await params).slug);
  return { title: lab ? `${lab.name} — ${lab.schoolName}` : "FabLab introuvable" };
}

export default async function LabShowcase({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lab = await getLabBySlug(slug);
  if (!lab) notFound();
  const [settings, resources, gallery, user, [manager], [{ n: students }]] = await Promise.all([
    getSettings(lab.id), listResourcesWithRooms(lab.id),
    db.select().from(projects).where(and(eq(projects.labId, lab.id), eq(projects.published, true))).orderBy(desc(projects.createdAt)).limit(12),
    getCurrentUser(),
    db.select({ name: users.name }).from(users).where(and(eq(users.labId, lab.id), eq(users.role, "fabmanager"))).limit(1),
    db.select({ n: count() }).from(users).where(and(eq(users.labId, lab.id), eq(users.role, "student"))),
  ]);
  const machines = resources.filter((r) => r.type === "machine" && r.status !== "desactivee");
  const rooms = resources.filter((r) => r.type === "salle" && r.status !== "desactivee");
  const openDays = settings.openDays.split(",").map(Number);
  const isMember = user?.labId === lab.id;
  const cta = isMember ? (user!.role === "fabmanager" ? "/admin" : "/app/reserver") : `/register?lab=${lab.slug}`;
  const cover = mediaUrl(lab.coverId, "/images/workshop.jpg")!;
  const managerPhoto = mediaUrl(lab.managerPhotoId);
  const appHref = user ? user.role === "fabmanager" ? "/admin" : "/app" : null;
  const nav = [{ href: "#machines", label: "L’atelier" }, { href: "#projets", label: "Les réalisations" }, { href: "#horaires", label: "Horaires" }, { href: "#responsable", label: "Le responsable" }];
  return (
    <>
      <PublicHeader nav={nav} appHref={appHref} joinHref={cta} joinLabel="Rejoindre ce lab" />
      <main>
        <section className="site-container pb-14 pt-7 sm:pt-10">
          <Link href="/#labs" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-togo-green dark:hover:text-lime"><ArrowLeft className="h-3 w-3" />Tous les FabLabs</Link>
          <div className="mt-8 grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <Reveal variant="group"><div className="mb-5 flex items-center gap-3">{lab.logoId ? <img src={mediaUrl(lab.logoId)!} data-gallery="presentation-lab" alt={`Logo ${lab.name}`} className="h-14 w-14 rounded-2xl border border-border bg-white object-contain p-1" /> : <BrandMark className="h-14 w-14" />}<span className="text-[13px] font-semibold uppercase tracking-[0.13em] text-togo-green dark:text-lime">FabLab scolaire<br /><span className="mt-1 inline-block font-normal text-muted-foreground">{lab.schoolName}</span></span></div><h1 className="display-text text-[43px] sm:text-[55px]"><MaskLine>{lab.name}</MaskLine></h1>{lab.motto && <p className="mt-5 max-w-[330px] font-display text-xl font-semibold text-togo-green dark:text-lime">{lab.motto}</p>}<p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{[lab.city, lab.region, lab.country].filter(Boolean).join(" · ")}</p><div className="mt-7 flex flex-wrap gap-3"><Link href={cta} className={buttonClass("primary", "lg")}><CalendarCheck2 className="h-4 w-4" />{isMember ? "Accéder à mon atelier" : "Je rejoins ce lab"}<ArrowUpRight className="h-4 w-4" /></Link><a href="#machines" className={buttonClass("outline", "lg")}>Explorer les machines</a></div><p className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"><Check className="h-3.5 w-3.5 text-togo-green dark:text-lime" />Ouvert aux élèves de la 6e à la Terminale</p></Reveal>
            <Reveal variant="clip" delay={150} className="parallax relative overflow-hidden rounded-[24px]"><img src={cover} data-gallery="presentation-lab" alt={lab.coverId ? `L'atelier de ${lab.name}` : "Illustration d'un atelier de fabrication numérique"} width={1500} height={1000} fetchPriority="high" className="h-[270px] w-full rounded-[24px] object-cover sm:h-[400px]" />{!lab.coverId && <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[13px] font-medium text-forest">Visuel d’illustration</span>}<div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/30 bg-white/90 px-3 py-2 text-[13px] font-semibold text-forest"><span className="h-1.5 w-1.5 rounded-full bg-togo-green" />Un lieu pour apprendre par le faire</div></Reveal>
          </div>
          <Reveal delay={200} className="mt-9 grid grid-cols-3 gap-3 rounded-[18px] border border-border bg-card p-5 sm:p-6">{[{ icon: Wrench, n: machines.length, l: "machines" }, { icon: GraduationCap, n: students, l: "élèves" }, { icon: Images, n: gallery.length, l: "projets publiés" }].map((s) => <div key={s.l} className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-center sm:gap-3"><s.icon className="h-4 w-4 text-togo-green dark:text-lime" /><CountUp value={s.n} pad={1} className="font-display text-2xl font-extrabold tabular-nums" /><span className="text-[13px] text-muted-foreground">{s.l}</span></div>)}</Reveal>
        </section>

        {lab.description && <section className="border-y border-border bg-muted/40"><div className="site-container grid gap-6 py-10 md:grid-cols-[0.45fr_1fr]"><Reveal variant="group"><p className="eyebrow text-togo-green dark:text-lime">Notre atelier</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight"><MaskLine>Faire ensemble.</MaskLine></h2></Reveal><Reveal variant="blur" delay={120} as="p" className="max-w-2xl text-base leading-8 text-muted-foreground">{lab.description}</Reveal></div></section>}

        <section id="machines" className="site-container section"><SectionHeading index="01" eyebrow="De vrais outils pour vos idées" title="L’atelier vous attend." lead="Chaque machine a son niveau d’autonomie. Le responsable vous accompagne pour progresser en sécurité." />
          {machines.length === 0 ? <EmptyState icon={<Wrench className="h-7 w-7" />} title="L’atelier se prépare" text="Les premières machines seront bientôt ajoutées par le responsable." /> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><Stagger>{machines.map((m) => { const photo = mediaUrl(m.photoId); return <Reveal as="article" key={m.id} className="flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-border bg-card"><div className="relative aspect-[4/3] bg-muted">{photo ? <img src={photo} data-gallery="machines" alt={m.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="dot-paper grid h-full place-items-center"><span className="grid h-20 w-20 place-items-center rounded-[22px] border border-togo-green/10 bg-card/70 text-togo-green dark:text-lime"><ResourceIcon icon={m.icon} className="h-9 w-9 stroke-[1.4]" /></span></div>}<div className="pointer-events-none absolute left-3 top-3"><ResourceStatusBadge status={m.status} /></div>{photo && <span aria-hidden="true" className="pointer-events-none absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white backdrop-blur-sm"><Expand className="h-4 w-4" /></span>}</div><div className="flex flex-1 flex-col p-4"><p className="text-[13px] uppercase tracking-[0.12em] text-muted-foreground">{m.category}</p><h3 className="mt-1.5 text-base font-extrabold leading-snug">{m.name}</h3>{m.description && <p className="mt-2 text-[13px] leading-5 text-muted-foreground">{m.description}</p>}{m.roomName && <p className="mt-2 text-[13px] text-muted-foreground">{m.roomName}</p>}<div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><LevelBadge level={m.requiredLevel} /><span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground"><Clock3 className="h-3 w-3" />{m.maxDurationMinutes} min max.</span></div></div></Reveal>; })}</Stagger></div>}
          {rooms.length > 0 && <div className="mt-6 grid gap-3 sm:grid-cols-3">{rooms.map((r) => <div key={r.id} className="flex min-w-0 items-center gap-3 rounded-[16px] border border-border bg-card p-4">{r.photoId ? <img src={mediaUrl(r.photoId)!} data-gallery="salles" alt={r.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sand text-forest"><ResourceIcon icon={r.icon} className="h-5 w-5" /></span>}<div className="min-w-0"><h3 className="text-sm font-bold">{r.name}</h3><p className="mt-1 text-[13px] text-muted-foreground">{r.capacity} places · max. {r.maxDurationMinutes} min</p></div></div>)}</div>}
        </section>

        <section id="projets" className="border-y border-border bg-muted/30"><div className="site-container section"><SectionHeading index="02" eyebrow="Leurs idées ont pris forme" title="La galerie des élèves." action={isMember && <Link href="/app/projets" className={buttonClass("outline", "md", "text-sm")}>Proposer mon projet<ArrowUpRight className="h-4 w-4" /></Link>} />{gallery.length === 0 ? <EmptyState icon={<Images className="h-7 w-7" />} title="Les premiers projets arrivent bientôt" text="Un objet, un robot ou une invention : chaque réalisation mérite d’être partagée." /> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Stagger>{gallery.map((p) => <Reveal key={p.id}><ProjectCard p={p} /></Reveal>)}</Stagger></div>}</div></section>

        <section id="horaires" className="site-container section grid gap-8 lg:grid-cols-[0.75fr_1.2fr]"><Reveal variant="group"><p className="eyebrow text-muted-foreground"><span className="mr-2 font-mono text-[13px] tracking-normal">03</span>Organiser sa prochaine visite</p><h2 className="section-title mt-3"><MaskLine>Quand venir</MaskLine><MaskLine className="[--line:1]">fabriquer ?</MaskLine></h2><p className="mt-4 max-w-[290px] text-sm leading-6 text-muted-foreground">Les créneaux se réservent par tranches de {settings.slotStepMinutes} minutes, jusqu&apos;à {settings.maxDurationMinutes} minutes par réservation.</p>{settings.announcement && <div className="mt-5 rounded-2xl border border-togo-yellow/40 bg-togo-yellow/10 p-4 text-[13px] leading-6">{settings.announcement}</div>}</Reveal><Reveal variant="left" delay={120} className="rounded-[22px] border border-border bg-card p-2 sm:p-4">{[1, 2, 3, 4, 5, 6, 0].map((d, i) => { const isOpen = openDays.includes(d); return <div key={d} className={`flex items-center justify-between gap-3 px-4 py-3.5 text-sm ${i > 0 ? "border-t border-border/60" : ""}`}><span className={`flex items-center gap-2 ${isOpen ? "font-medium" : "text-muted-foreground"}`}><span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-togo-green dark:bg-lime" : "bg-border"}`} />{DAY_NAMES[d]}</span><span className={isOpen ? "font-medium" : "text-muted-foreground"}>{isOpen ? `${settings.openTime} — ${settings.closeTime}` : "Fermé"}</span></div>; })}</Reveal></section>

        <section id="responsable" className="site-container pb-16"><Reveal variant="scale" className="grid gap-7 rounded-[24px] bg-lime p-6 text-forest sm:p-10 md:grid-cols-[auto_1fr]">{managerPhoto ? <img src={managerPhoto} data-gallery="equipe" alt={manager?.name ?? "Responsable du FabLab"} className="h-32 w-32 rounded-[22px] object-cover object-center" /> : <span className="grid h-28 w-28 place-items-center rounded-[22px] border border-forest/15 bg-white/25 font-display text-4xl font-bold">{(manager?.name ?? lab.name).split(/\s+/).slice(0, 2).map((n) => n[0]).join("")}</span>}<div><p className="text-[13px] font-semibold uppercase tracking-[0.15em] text-forest/80">Votre guide dans l&apos;atelier</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">{manager?.name ?? "Responsable du lab"}</h2><p className="mt-1 text-sm text-forest/80">Responsable du FabLab · {lab.schoolName}</p><div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">{lab.contactEmail && <span className="inline-flex max-w-full items-center gap-2 break-all"><Mail className="h-4 w-4 shrink-0" />{lab.contactEmail}</span>}{lab.contactPhone && <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" />{lab.contactPhone}</span>}{(lab.contactPhone || lab.contactEmail) && <ContactButtons phone={lab.contactPhone} email={lab.contactEmail} />}</div></div></Reveal></section>
      </main>
    </>
  );
}
