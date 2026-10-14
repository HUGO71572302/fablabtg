import type { Metadata } from "next";
import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { fmtDateCompact, fmtTime } from "@/lib/dates";
import { Badge, Button, Card, CardContent, CardHeader, EmptyState, Input, Label, PageHeader, Select, Stat, buttonClass, cn } from "@/components/ui";
import { journalFilter, journalSummary, listJournal, listStock, MOVEMENT_LABEL, MOVEMENT_TYPES, movementRef, STOCK_CATEGORY_LABEL, type MovementType } from "@/lib/stock";

export const metadata: Metadata = { title: "Journal entrées / sorties" };
export const dynamic = "force-dynamic";

const PERIODS = [
  { v: "jour", l: "Aujourd'hui" },
  { v: "semaine", l: "7 jours" },
  { v: "mois", l: "30 jours" },
  { v: "tout", l: "Tout" },
];
const TYPE_TONE: Record<MovementType, "green" | "blue" | "red" | "yellow"> = { entree: "green", sortie: "blue", perte: "red", ajustement: "yellow" };

export default async function StockJournalPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const f = journalFilter(admin.labId, sp);
  const [rows, summary, items] = await Promise.all([listJournal({ ...f, limit: 500 }), journalSummary(f), listStock(admin.labId, true)]);
  const totals = summary.reduce(
    (t, r) => ({ entrees: t.entrees + r.entrees, sorties: t.sorties + r.sorties, pertes: t.pertes + r.pertes, ajustements: t.ajustements + r.ajustements }),
    { entrees: 0, sorties: 0, pertes: 0, ajustements: 0 },
  );
  const activePeriod = !sp.from && !sp.to ? (sp.periode ?? "mois") : null;
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v ? [[k, v]] : []))).toString();

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Traçabilité"
        title="Journal des entrées et sorties"
        subtitle="Chaque mouvement du stock, filtrable par période, type et article. Imprimez le journal, une fiche article ou un reçu."
        action={
          <div className="flex flex-wrap gap-2">
            <a href={`/print/stock/journal?${qs}`} target="_blank" rel="noreferrer" className={buttonClass("primary", "md")}>
              <Printer className="h-4 w-4" /> Imprimer le journal
            </a>
            <a href={`/api/stock/journal?${qs}`} className={buttonClass("outline", "md")}>
              <Download className="h-4 w-4" /> Exporter (Excel)
            </a>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <Link
                key={p.v}
                href={`/admin/stock/journal?periode=${p.v}`}
                aria-current={activePeriod === p.v ? "true" : undefined}
                className={cn(
                  "rounded-full border px-4 py-2 text-base font-bold transition",
                  activePeriod === p.v ? "border-togo-green bg-togo-green text-white dark:bg-lime dark:text-forest" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {p.l}
              </Link>
            ))}
          </div>
          <form method="get" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <Label htmlFor="from">Du</Label>
              <Input id="from" type="date" name="from" defaultValue={f.from ?? ""} />
            </div>
            <div>
              <Label htmlFor="to">Au</Label>
              <Input id="to" type="date" name="to" defaultValue={f.to ?? ""} />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select id="type" name="type" defaultValue={f.type ?? "all"}>
                <option value="all">Tous les mouvements</option>
                {MOVEMENT_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="item">Article</Label>
              <Select id="item" name="item" defaultValue={f.itemId ?? ""}>
                <option value="">Tous les articles</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Appliquer</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Entrées" value={`+${totals.entrees}`} accent="green" hint="unités reçues" />
        <Stat label="Sorties" value={totals.sorties} accent="neutral" hint="unités consommées" />
        <Stat label="Pertes & casses" value={totals.pertes} accent="red" hint="à surveiller" />
        <Stat label="Mouvements" value={rows.length} accent="yellow" hint={rows.length >= 500 ? "500 plus récents affichés" : "sur la période"} />
      </div>

      <Card>
        <CardHeader eyebrow="Synthèse" title="Bilan par article" subtitle="Totaux de la période. Le solde est le stock actuel." />
        <CardContent className="overflow-x-auto">
          {summary.length === 0 ? (
            <EmptyState title="Aucun mouvement sur cette période" text="Élargissez la période ou enregistrez une entrée ou une sortie depuis la fiche d'un article." />
          ) : (
            <table className="w-full min-w-[640px] text-left text-[16px]">
              <thead>
                <tr className="border-b border-border text-[15px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="py-3 pr-3">Article</th>
                  <th className="py-3 pr-3 text-right">Entrées</th>
                  <th className="py-3 pr-3 text-right">Sorties</th>
                  <th className="py-3 pr-3 text-right">Pertes</th>
                  <th className="py-3 pr-3 text-right">Ajust.</th>
                  <th className="py-3 text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((r) => (
                  <tr key={r.itemId} className="border-b border-border/70">
                    <td className="py-3 pr-3">
                      <p className="font-bold">{r.name}</p>
                      <p className="text-base text-muted-foreground">{STOCK_CATEGORY_LABEL[r.category]}</p>
                    </td>
                    <td className="py-3 pr-3 text-right font-bold tabular-nums text-togo-green dark:text-lime">+{r.entrees}</td>
                    <td className="py-3 pr-3 text-right font-bold tabular-nums">{r.sorties}</td>
                    <td className="py-3 pr-3 text-right font-bold tabular-nums text-togo-red">{r.pertes}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{r.ajustements > 0 ? `+${r.ajustements}` : r.ajustements}</td>
                    <td className="py-3 text-right font-extrabold tabular-nums">{r.current} <span className="text-base font-medium text-muted-foreground">{r.unit}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader eyebrow="Détail" title="Mouvements" subtitle="Cliquez sur « Reçu » pour imprimer le justificatif d'un mouvement, ou sur « Fiche » pour la fiche complète de l'article." />
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState title="Aucun mouvement" text="Aucune entrée ni sortie ne correspond à ces filtres." />
          ) : (
            <table className="w-full min-w-[900px] text-left text-[16px]">
              <thead>
                <tr className="border-b border-border text-[15px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="py-3 pr-3">Réf.</th>
                  <th className="py-3 pr-3">Date</th>
                  <th className="py-3 pr-3">Article</th>
                  <th className="py-3 pr-3">Type</th>
                  <th className="py-3 pr-3 text-right">Quantité</th>
                  <th className="py-3 pr-3">Remis à</th>
                  <th className="py-3 pr-3">Par</th>
                  <th className="py-3 text-right">Documents</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const at = new Date(r.createdAt);
                  return (
                    <tr key={r.id} className="border-b border-border/70 align-top">
                      <td className="py-3 pr-3 font-mono text-base font-bold">{movementRef(r.id)}</td>
                      <td className="whitespace-nowrap py-3 pr-3">
                        <p className="font-bold">{fmtDateCompact(at)}</p>
                        <p className="text-base text-muted-foreground">{fmtTime(at)}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-bold">{r.itemName}</p>
                        {r.note && <p className="text-base text-muted-foreground">{r.note}</p>}
                      </td>
                      <td className="py-3 pr-3"><Badge tone={TYPE_TONE[r.type]}>{MOVEMENT_LABEL[r.type]}</Badge></td>
                      <td className={cn("py-3 pr-3 text-right font-extrabold tabular-nums", r.delta > 0 ? "text-togo-green dark:text-lime" : r.delta < 0 ? "text-togo-red" : "text-amber-700 dark:text-togo-yellow")}>
                        {r.delta > 0 ? `+${r.delta}` : r.delta} <span className="text-base font-medium text-muted-foreground">{r.itemUnit}</span>
                      </td>
                      <td className="py-3 pr-3">{r.beneficiary ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-3 pr-3">{r.userName ?? "Système"}</td>
                      <td className="whitespace-nowrap py-3 text-right font-bold">
                        <a href={`/print/stock/recu/${r.id}`} target="_blank" rel="noreferrer" className="text-togo-green underline-offset-4 hover:underline dark:text-lime">Reçu</a>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <a href={`/print/stock/fiche/${r.itemId}`} target="_blank" rel="noreferrer" className="text-togo-green underline-offset-4 hover:underline dark:text-lime">Fiche</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
