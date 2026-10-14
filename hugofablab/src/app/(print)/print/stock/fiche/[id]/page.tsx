import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintBar } from "@/components/print/print-bar";
import { PrintHeader, PrintSection, PrintSignatures } from "@/components/print/print-parts";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, fmtDateCompact, fmtTime } from "@/lib/dates";
import { getLab } from "@/lib/labs";
import { getItemLedger, itemRef, MOVEMENT_LABEL, STOCK_CATEGORY_LABEL } from "@/lib/stock";

export const metadata: Metadata = { title: "Fiche de stock" };
export const dynamic = "force-dynamic";

export default async function PrintItemSheet({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [lab, ledger] = await Promise.all([getLab(admin.labId), getItemLedger(admin.labId, Number(id))]);
  if (!lab || !ledger) notFound();
  const { item, lines, balance } = ledger;
  const gap = balance !== item.quantity;
  return (
    <main className="print-screen">
      <PrintBar backHref="/admin/stock" label="Imprimer la fiche" />
      <article className="print-sheet">
        <PrintHeader lab={lab} title="Fiche de stock" reference={itemRef(item.id)} subtitle={`Éditée le ${fmtDate(new Date())}`} />
        <PrintSection title="Identification de l'article">
          <div className="print-identity">
            {item.photoId && <img src={`/api/media/${item.photoId}`} alt={item.name} className="h-32 w-32 rounded-xl object-cover" />}
            <div className="print-identity-main"><h2 className="print-person-name">{item.name}</h2><dl className="print-kv-grid">
              {[["Catégorie", STOCK_CATEGORY_LABEL[item.category]], ["Unité", item.unit], ["Emplacement", item.location ?? "—"], ["Fournisseur", item.supplier ?? "—"], ["Seuil d'alerte", String(item.minQuantity)], ["Note", item.note ?? "—"]].map(([k, v]) => <div key={k} className="print-kv"><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl></div>
          </div>
        </PrintSection>
        <PrintSection title="État du stock">
          <div className="print-metrics" style={{ "--metric-columns": 2 } as React.CSSProperties}>
            <div className="print-metric is-strong"><p className="print-metric-value">{item.quantity}</p><p className="print-metric-label">Stock actuel · {item.unit}</p></div>
            <div className="print-metric"><p className="print-metric-value">{balance}</p><p className="print-metric-label">{gap ? "Écart à vérifier" : "Solde du journal cohérent"}</p></div>
          </div>
        </PrintSection>
        <PrintSection title={`Historique des mouvements · ${lines.length}`}>
          <div className="print-table-wrap"><table className="print-table"><thead><tr><th>Date</th><th>Type</th><th className="num">Quantité</th><th className="num">Solde</th><th>Remis à</th><th>Par / motif</th></tr></thead><tbody>
            {lines.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 24 }}>Aucun mouvement enregistré.</td></tr>}
            {[...lines].reverse().map((l) => { const at = new Date(l.createdAt); return <tr key={l.id}><td className="whitespace-nowrap">{fmtDateCompact(at)}<br /><span className="muted">{fmtTime(at)}</span></td><td>{MOVEMENT_LABEL[l.type]}</td><td className="num strong">{l.delta > 0 ? `+${l.delta}` : l.delta}</td><td className="num strong">{l.balance}</td><td>{l.beneficiary ?? "—"}</td><td>{l.userName ?? "Système"}{l.note ? <><br /><span className="muted">{l.note}</span></> : null}</td></tr>; })}
          </tbody></table></div>
        </PrintSection>
        <PrintSignatures labels={["Vérifié par", "Date et signature"]} />
      </article>
    </main>
  );
}
