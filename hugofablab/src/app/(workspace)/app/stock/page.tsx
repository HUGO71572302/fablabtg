import Link from "next/link";
import { ArrowUpRight, Boxes, PackageCheck, ShieldCheck } from "lucide-react";
import { StockBoard } from "@/components/stock/stock-board";
import { Card, CardContent, CardHeader, PageHeader, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listStock, stockCounts } from "@/lib/stock";

export const metadata = { title: "Stock du lab" };
export const dynamic = "force-dynamic";

export default async function StudentStockPage() {
  const user = await requireUser();
  const [items, counts] = await Promise.all([listStock(user.labId, true), stockCounts(user.labId)]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Inventaire du lab"
        title="Ce qu'il y a dans l'atelier"
        subtitle="Consultez les consommables, matières et pièces disponibles avant de réserver votre créneau."
        action={<Link href="/app/reserver" className={buttonClass("primary", "md")}>Réserver une machine<ArrowUpRight className="h-4 w-4" /></Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime text-forest"><Boxes className="h-5 w-5" /></span>
          <div><p className="font-display text-[20px] font-extrabold tabular-nums leading-none">{counts.total}</p><p className="mt-1 text-[13px] font-bold uppercase tracking-[0.13em] text-muted-foreground">références</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-togo-green/10 text-togo-green dark:text-lime"><PackageCheck className="h-5 w-5" /></span>
          <div><p className="font-display text-[20px] font-extrabold tabular-nums leading-none">{counts.units}</p><p className="mt-1 text-[13px] font-bold uppercase tracking-[0.13em] text-muted-foreground">unités disponibles</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-togo-yellow/20 text-amber-700 dark:text-togo-yellow"><ShieldCheck className="h-5 w-5" /></span>
          <div><p className="font-display text-[20px] font-extrabold tabular-nums leading-none">{counts.low + counts.out}</p><p className="mt-1 text-[13px] font-bold uppercase tracking-[0.13em] text-muted-foreground">alertes de stock</p></div>
        </Card>
      </div>

      <Card>
        <CardHeader eyebrow="Avant de venir" title="Comment ça marche ?" />
        <CardContent className="grid gap-3 text-[15px] leading-6 text-muted-foreground sm:grid-cols-2">
          <p><b className="text-foreground">Consultez avant de réserver</b> : vérifiez qu'il reste du filament, du bois ou des composants pour votre projet.</p>
          <p><b className="text-foreground">Le responsable gère le stock</b> : seuls les mouvements validés par le FabManager sont enregistrés dans le journal.</p>
        </CardContent>
      </Card>

      <StockBoard items={items} movementsByItem={{}} readOnly />
    </div>
  );
}
