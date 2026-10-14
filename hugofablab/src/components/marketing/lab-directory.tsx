"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, GraduationCap, MapPin, Plus, Search, Wrench } from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { cn } from "@/components/ui";

export type DirectoryLab = { id: number; slug: string; name: string; school: string; city: string | null; region: string | null; coverUrl: string; logoUrl: string | null; machines: number; students: number; projects: number };

export function LabDirectory({ labs }: { labs: DirectoryLab[] }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const regions = [...new Set(labs.map((l) => l.region).filter((r): r is string => Boolean(r)))];
  const filtered = useMemo(() => labs.filter((l) => (!region || l.region === region) && (!query || [l.name, l.school, l.city, l.region].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")))), [labs, query, region]);
  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setRegion("")} className={cn("rounded-full px-4 py-2 text-[13px] font-semibold", !region ? "bg-forest text-white" : "border border-border hover:bg-muted")}>Tous les labs <span className="ml-2 opacity-60">{labs.length}</span></button>{regions.map((r) => <button key={r} type="button" onClick={() => setRegion(r)} className={cn("rounded-full border px-4 py-2 text-[13px] font-medium", region === r ? "border-togo-green bg-togo-green/10 text-togo-green dark:text-lime" : "border-border text-muted-foreground hover:bg-muted")}>{r}</button>)}</div>
        <div className="relative w-full sm:w-[250px]"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Rechercher un FabLab" type="search" placeholder="Une école, une ville, un lab…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 w-full rounded-full border border-border bg-card py-2 pl-10 pr-4 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/15" /></div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => (
          <Link key={l.id} href={`/lab/${l.slug}`} className="image-zoom group rounded-[22px] border border-border bg-card transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_45px_-22px_#173f3040]">
            <div className="relative aspect-[16/10] overflow-hidden"><img src={l.coverUrl} alt={`Atelier de ${l.name}`} className="h-full w-full object-cover" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" /><span className="absolute left-4 top-4 rounded-full border border-white/40 bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-forest">FABLAB SCOLAIRE</span><span className="absolute bottom-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-white text-forest transition group-hover:bg-lime"><ArrowUpRight className="h-4 w-4" /></span></div>
            <div className="p-5"><div className="flex items-start gap-3">{l.logoUrl ? <img src={l.logoUrl} alt={`Logo de ${l.name}`} data-gallery="labs" className="h-10 w-10 rounded-xl border border-border bg-white object-contain" /> : <BrandMark className="h-10 w-10 rounded-xl" />}<div className="min-w-0"><h3 className="text-[16px] font-extrabold tracking-tight">{l.name}</h3><p className="mt-0.5 text-[13px] text-muted-foreground">{l.school}</p></div></div><p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted-foreground"><MapPin className="h-3 w-3" />{[l.city, l.region].filter(Boolean).join(" · ") || "Localisation à préciser"}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-[13px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Wrench className="h-3 w-3" /><b className="text-foreground">{l.machines}</b> machines</span><span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /><b className="text-foreground">{l.students}</b> élèves</span><span><b className="text-foreground">{l.projects}</b> projets</span></div></div>
          </Link>
        ))}
        {!filtered.length && <div className="rounded-[22px] border border-dashed border-border bg-card p-10 text-center md:col-span-2"><Search className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 text-base font-semibold">Aucun lab ne correspond à cette recherche.</p><button type="button" onClick={() => { setQuery(""); setRegion(""); }} className="mt-3 text-sm font-semibold text-togo-green dark:text-lime">Réinitialiser les filtres</button></div>}
        <Link href="/creer-mon-lab" className="group flex min-h-[300px] flex-col items-center justify-center rounded-[22px] border border-dashed border-togo-green/25 bg-togo-green/[0.035] px-7 py-8 text-center transition hover:bg-togo-green/[0.07] dark:border-lime/20"><span className="grid h-12 w-12 place-items-center rounded-full border border-togo-green/20 text-togo-green dark:text-lime"><Plus className="h-5 w-5" /></span><h3 className="mt-5 text-2xl font-extrabold tracking-tight">Le prochain lab,<br />c&apos;est le vôtre ?</h3><p className="mt-3 max-w-[210px] text-sm leading-6 text-muted-foreground">Votre école a des machines et des idées ? Offrez-leur un espace pour grandir.</p><span className="mt-6 flex items-center gap-2 text-[13px] font-semibold text-togo-green dark:text-lime">Inscrire mon établissement<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span></Link>
      </div>
    </div>
  );
}
