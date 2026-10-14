import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintBar } from "@/components/print/print-bar";
import { PrintHeader, PrintSection, PrintSignatures, printDate } from "@/components/print/print-parts";
import { requireAdmin } from "@/lib/auth";
import { getLab } from "@/lib/labs";
import { getReceipt, movementRef, MOVEMENT_LABEL, STOCK_CATEGORY_LABEL } from "@/lib/stock";

export const metadata: Metadata = { title: "Reçu de mouvement" };
export const dynamic = "force-dynamic";

export default async function PrintReceipt({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [lab, r] = await Promise.all([getLab(admin.labId), getReceipt(admin.labId, Number(id))]);
  if (!lab || !r) notFound();
  const at = new Date(r.createdAt);
  const signed = r.delta > 0 ? `+${r.delta}` : `${r.delta}`;
  const fields: [string, string][] = [
    ["Type de mouvement", MOVEMENT_LABEL[r.type]],
    ["Article", r.itemName],
    ["Catégorie", STOCK_CATEGORY_LABEL[r.itemCategory]],
    ["Remis à", r.beneficiary ?? "—"],
    ["Enregistré par", r.userName ?? "Système"],
    ["Motif", r.note ?? "—"],
  ];

  return (
    <main className="print-screen">
      <PrintBar backHref="/admin/stock/journal" label="Imprimer le reçu" />
      <article className="print-sheet print-receipt">
        <PrintHeader lab={lab} title="Reçu de mouvement" reference={movementRef(r.id)} subtitle={printDate(at)} />
        <PrintSection title="Informations du mouvement">
          <dl className="print-kv-grid">
            {fields.map(([k, v]) => <div key={k} className="print-kv"><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </PrintSection>
        <PrintSection title="État du stock après mouvement">
          <div className="print-metrics" style={{ "--metric-columns": 3 } as React.CSSProperties}>
            <div className="print-metric"><p className="print-metric-value">{r.balanceBefore}</p><p className="print-metric-label">Avant · {r.itemUnit}</p></div>
            <div className="print-metric is-strong"><p className="print-metric-value">{signed}</p><p className="print-metric-label">Mouvement · {r.itemUnit}</p></div>
            <div className="print-metric"><p className="print-metric-value">{r.balanceAfter}</p><p className="print-metric-label">Après · {r.itemUnit}</p></div>
          </div>
        </PrintSection>
        <PrintSignatures labels={["Remis par", "Reçu par"]} />
        <p className="print-footnote">Conservez ce reçu : il atteste du mouvement inscrit au journal de stock de {lab.name}.</p>
      </article>
    </main>
  );
}
