import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, GraduationCap, Search, TrendingUp } from "lucide-react";
import { GradeRow } from "@/components/admin/grade-form";
import { EmptyState, PageHeader, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { classCode, learnersWithStats, listGrades } from "@/lib/pedagogy";

export const metadata: Metadata = { title: "Suivi pédagogique" };
export const dynamic = "force-dynamic";

const SORTS = ["classe", "fiche", "note", "nom"];

export default async function PedagogyListPage({ searchParams }: { searchParams: Promise<{ q?: string; classe?: string; tri?: string }> }) {
  const admin = await requireAdmin();
  const { q = "", classe = "", tri = "classe" } = await searchParams;
  const all = await learnersWithStats(admin.labId);
  const classes = [...new Set(all.map((l) => classCode(l.classLevel, l.section)))];
  const needle = q.trim().toLowerCase();
  const byNote = (a: (typeof all)[number], b: (typeof all)[number]) =>
    (b.moyenne ?? -1) - (a.moyenne ?? -1);
  const rows = all
    .filter((l) => !classe || classCode(l.classLevel, l.section) === classe)
    .filter((l) => !needle || [l.name, l.username, l.phone, l.sheetNumber].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle)))
    .sort((a, b) => (SORTS.includes(tri) ? tri === "nom" ? a.name.localeCompare(b.name, "fr") : tri === "note" ? byNote(a, b) : tri === "fiche" ? (a.sheetNumber ?? "").localeCompare(b.sheetNumber ?? "") : classCode(a.classLevel, a.section).localeCompare(classCode(b.classLevel, b.section)) || (a.sheetNumber ?? "").localeCompare(b.sheetNumber ?? "") : 0));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Enseignants"
        title="Suivi pédagogique"
        subtitle="Notes et observations de vos apprenants, classés par fiche. Chaque classe possède sa propre numérotation : 6E-001, TLE-D2-003…"
        action={
          <span className="inline-flex items-center gap-2 rounded-xl bg-lime px-3 py-2 text-sm font-bold text-forest">
            <TrendingUp className="h-4 w-4" />
            {all.filter((l) => l.moyenne != null).length} apprenant(s) noté(s)
          </span>
        }
      />

      <form method="get" className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={q} placeholder="Rechercher un apprenant…" aria-label="Rechercher un apprenant" className="min-h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-base" />
        </div>
        <select name="classe" defaultValue={classe} aria-label="Filtrer par classe" className="min-h-11 rounded-xl border border-border bg-card px-3 text-base">
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c} value={c}>{c} ({all.filter((l) => classCode(l.classLevel, l.section) === c).length})</option>
          ))}
        </select>
        <select name="tri" defaultValue={tri} aria-label="Trier" className="min-h-11 rounded-xl border border-border bg-card px-3 text-base">
          <option value="classe">Trier par classe</option>
          <option value="fiche">Trier par n° de fiche</option>
          <option value="note">Trier par moyenne</option>
          <option value="nom">Trier par nom</option>
        </select>
        <button type="submit" className="min-h-11 rounded-xl border border-border px-4 text-base font-semibold hover:bg-muted">Filtrer</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="Aucun apprenant" text="Modifiez vos filtres." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((l) => (
            <Link
              key={l.id}
              href={`/admin/suivi/${l.id}`}
              className={cn("group rounded-[18px] border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-lg", !l.active && "opacity-60")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-togo-green dark:text-lime">{l.sheetNumber ?? "N° à attribuer"}</p>
                  <p className="mt-1 truncate text-base font-extrabold">{l.name}</p>
                  <p className="text-[13px] text-muted-foreground">{classCode(l.classLevel, l.section)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("font-display text-[32px] font-extrabold leading-none tabular-nums", l.moyenne == null ? "text-muted-foreground" : l.moyenne >= 10 ? "text-togo-green dark:text-lime" : "text-togo-red")}>
                    {l.moyenne == null ? "—" : l.moyenne.toFixed(1)}
                  </p>
                  <p className="text-[11px] font-bold text-muted-foreground">/ 20</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[13px] text-muted-foreground">
                <span>{l.notes} note(s) · {l.observations} obs.</span>
                <span className="inline-flex items-center gap-1 font-bold text-togo-green opacity-0 transition group-hover:opacity-100 dark:text-lime">Ouvrir <ArrowUpRight className="h-3.5 w-3.5" /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
