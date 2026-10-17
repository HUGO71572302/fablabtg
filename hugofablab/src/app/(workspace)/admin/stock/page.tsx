import Link from "next/link";
import { Boxes, History, ShieldCheck, Truck } from "lucide-react";
import { ConsumptionChart } from "@/components/stock/consumption-chart";
import { StockBoard } from "@/components/stock/stock-board";
import { StockEditor } from "@/components/stock/stock-editor";
import { Badge, Card, CardContent, CardHeader, PageHeader, Stat, buttonClass, cn } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { fmtDateCompact, fmtTime } from "@/lib/dates";
import { consumptionLastDays, listMovements, listStock, stockAlerts, stockCounts, MOVEMENT_LABEL, STOCK_CATEGORY_LABEL, type StockItemView, type StockMovementView } from "@/lib/stock";

export const metadata = { title: "Stock & matériel" };
export const dynamic = "force-dynamic";

export default async function AdminStockPage() {
  const admin = await requireAdmin();
  const [items, counts, days, movements, alerts] = await Promise.all([
    // Inclus les articles archivés : le tableau gère lui-même le filtre « Archivés » (sinon un article
    // archivé disparaîtrait des données du client et ne pourrait plus être réintégré).
    listStock(admin.labId, true),
    stockCounts(admin.labId),
    consumptionLastDays(admin.labId, 7),
    listMovements({ labId: admin.labId, limit: 60 }),
    stockAlerts(admin.labId, 5),
  ]);
  const movementsByItem: Record<number, StockMovementView[]> = {};
  for (const m of movements) (movementsByItem[m.itemId] ??= []).push(m);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Inventaire du lab"
        title="Stock & matériel"
        subtitle="Suivez consommables, matières, pièces et outillage. Chaque entrée et sortie est journalisée : vous savez toujours ce qui reste et qui l'a utilisé."
        action={<div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2"><Link href="/admin/stock/journal" className={buttonClass("outline", "md", "w-full justify-center")}><History className="h-4 w-4" />Journal entrées / sorties</Link><div className="[&_button]:w-full"><StockEditor /></div></div>}
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <Stat label="Références actives" value={counts.total} hint="articles suivis" accent="neutral" />
        <Stat label="Unités en stock" value={counts.units} hint="toutes catégories confondues" accent="green" />
        <Stat label="Sous le seuil" value={counts.low} hint="à réapprovisionner" accent="yellow" />
        <Stat label="En rupture" value={counts.out} hint="indisponibles pour les ateliers" accent="red" />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[1.55fr_1fr]">
        <StockBoard items={items} movementsByItem={movementsByItem} />

        <aside className="min-w-0 space-y-5">
          <Card>
            <CardHeader eyebrow="Consommation" title="Sorties sur 7 jours" subtitle="Mouvements de sortie et pertes enregistrés dans l'atelier." />
            <CardContent>
              <ConsumptionChart days={days} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader eyebrow="Traçabilité" title="Derniers mouvements" subtitle="Qui a pris quoi, et quand." />
            <CardContent>
              {movements.length === 0 ? (
                <p className="rounded-[14px] border border-dashed border-border px-4 py-6 text-center text-[15px] text-muted-foreground">
                  Le journal se remplira dès le premier mouvement.
                </p>
              ) : (
                <ol className="space-y-3.5">
                  {movements.slice(0, 8).map((m) => (
                    <li key={m.id} className="flex items-start gap-3">
                      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", m.delta > 0 ? "bg-togo-green dark:bg-lime" : m.delta < 0 ? "bg-togo-red" : "bg-togo-yellow")} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold leading-snug">
                          {m.delta > 0 ? `+${m.delta}` : m.delta} <span className="font-medium text-muted-foreground">· {MOVEMENT_LABEL[m.type]}</span>
                        </p>
                        <p className="truncate text-[13px] text-muted-foreground">
                          {m.userName ?? "Système"} · {fmtDateCompact(new Date(m.createdAt))} {fmtTime(new Date(m.createdAt))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader eyebrow="Bonnes pratiques" title="Un stock qui reste juste" />
            <CardContent className="space-y-3 text-[13px] leading-6 text-muted-foreground">
              <p className="flex gap-2.5"><History className="mt-0.5 h-4 w-4 shrink-0 text-togo-green dark:text-lime" /><span>Utilisez les boutons <b className="text-foreground">+ / −</b> pour les mouvements courants ; le journal garde la trace.</span></p>
              <p className="flex gap-2.5"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-togo-green dark:text-lime" /><span>Indiquez le <b className="text-foreground">fournisseur</b> et l'<b className="text-foreground">emplacement</b> : les réapprovisionnements deviennent un jeu d'enfant.</span></p>
              <p className="flex gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-togo-green dark:text-lime" /><span>Fixez un <b className="text-foreground">seuil d'alerte</b> : les articles critiques remontent automatiquement ici.</span></p>
            </CardContent>
          </Card>

          {alerts.length > 0 && (
            <Card>
              <CardHeader eyebrow="À traiter" title="Réapprovisionnements" />
              <CardContent className="space-y-2">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-[12px] border border-border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold">{a.name}</p>
                      <p className="text-[13px] text-muted-foreground">{STOCK_CATEGORY_LABEL[a.category]}{a.location ? ` · ${a.location}` : ""}</p>
                    </div>
                    <Badge tone={a.out ? "red" : "yellow"}>{a.out ? "Rupture" : `${a.quantity} ${a.unit}`}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
