import type { Metadata } from "next";
import type React from "react";
import { notFound } from "next/navigation";
import { PrintBar } from "@/components/print/print-bar";
import { PrintHeader, PrintSection, PrintSignatures } from "@/components/print/print-parts";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, fmtDateCompact, fmtTime } from "@/lib/dates";
import { getLab } from "@/lib/labs";
import { journalFilter, journalSummary, listJournal, MOVEMENT_LABEL, movementRef, STOCK_CATEGORY_LABEL } from "@/lib/stock";

export const metadata: Metadata = { title: "Journal du stock" };
export const dynamic = "force-dynamic";

export default async function PrintJournal({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const f = journalFilter(admin.labId, sp);
  const [lab, rows, summary] = await Promise.all([getLab(admin.labId), listJournal({ ...f, limit: 2000 }), journalSummary(f)]);
  if (!lab) notFound();
  const totals = summary.reduce((t, r) => ({ entrees: t.entrees + r.entrees, sorties: t.sorties + r.sorties, pertes: t.pertes + r.pertes, ajustements: t.ajustements + r.ajustements }), { entrees: 0, sorties: 0, pertes: 0, ajustements: 0 });
  const period = f.from || f.to ? `Du ${f.from ? fmtDate(new Date(`${f.from}T00:00:00Z`)) : "début"} au ${f.to ? fmtDate(new Date(`${f.to}T00:00:00Z`)) : "aujourd'hui"}` : "Toute la période";
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v ? [[k, v]] : []))).toString();
  return (
    <main className="print-screen">
      <PrintBar backHref={`/admin/stock/journal${qs ? `?${qs}` : ""}`} />
      <article className="print-sheet">
        <PrintHeader lab={lab} title="Journal des entrées et sorties" subtitle={`${period} · édité le ${fmtDate(new Date())}`} />
        <PrintSection title="Bilan de la période">
          <div className="print-metrics" style={{ "--metric-columns": 4 } as React.CSSProperties}>
            {[[`+${totals.entrees}`, "Entrées"], [String(totals.sorties), "Sorties"], [String(totals.pertes), "Pertes / casses"], [String(rows.length), "Mouvements"]].map(([n, l]) => <div key={l} className="print-metric"><p className="print-metric-value">{n}</p><p className="print-metric-label">{l}</p></div>)}
          </div>
        </PrintSection>
        <PrintSection title="Bilan par article">
          <div className="print-table-wrap"><table className="print-table"><thead><tr><th>Article</th><th className="num">Entrées</th><th className="num">Sorties</th><th className="num">Pertes</th><th className="num">Ajust.</th><th className="num">Solde actuel</th></tr></thead><tbody>
            {summary.map((r) => <tr key={r.itemId}><td><span className="strong">{r.name}</span><br /><span className="muted">{STOCK_CATEGORY_LABEL[r.category]}</span></td><td className="num strong">+{r.entrees}</td><td className="num strong">{r.sorties}</td><td className="num strong">{r.pertes}</td><td className="num">{r.ajustements > 0 ? `+${r.ajustements}` : r.ajustements}</td><td className="num strong">{r.current} {r.unit}</td></tr>)}
            <tr className="total-row"><td>Total</td><td className="num">+{totals.entrees}</td><td className="num">{totals.sorties}</td><td className="num">{totals.pertes}</td><td className="num">{totals.ajustements}</td><td /></tr>
          </tbody></table></div>
        </PrintSection>
        <PrintSection title={`Détail des mouvements · ${rows.length}`}>
          <div className="print-table-wrap"><table className="print-table"><thead><tr><th>Réf.</th><th>Date</th><th>Article</th><th>Type</th><th className="num">Quantité</th><th>Remis à</th><th>Par</th></tr></thead><tbody>
            {rows.map((r) => { const at = new Date(r.createdAt); return <tr key={r.id}><td className="strong" style={{ fontFamily: "ui-monospace, monospace" }}>{movementRef(r.id)}</td><td className="whitespace-nowrap">{fmtDateCompact(at)}<br /><span className="muted">{fmtTime(at)}</span></td><td><span className="strong">{r.itemName}</span>{r.note && <><br /><span className="muted">{r.note}</span></>}</td><td>{MOVEMENT_LABEL[r.type]}</td><td className="num strong">{r.delta > 0 ? `+${r.delta}` : r.delta} {r.itemUnit}</td><td>{r.beneficiary ?? "—"}</td><td>{r.userName ?? "Système"}</td></tr>; })}
          </tbody></table></div>
        </PrintSection>
        <PrintSignatures labels={["Le responsable du stock", "Le représentant des élèves"]} />
        <p className="print-footnote">Chaque mouvement est horodaté et attribué à la personne qui l&apos;a enregistré. Journal édité depuis HUGO FABLAB.</p>
      </article>
    </main>
  );
}
