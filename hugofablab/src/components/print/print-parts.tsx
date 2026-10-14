import { BrandMark } from "@/components/brand/logo";
import type { Lab } from "@/db/schema";
import { fmtDate, fmtTime } from "@/lib/dates";

/** En-tête commun des documents A4 : identité du lab, type du document et référence. */
export function PrintHeader({ lab, title, subtitle, reference }: { lab: Lab; title: string; subtitle?: string; reference?: string }) {
  return (
    <header className="print-header">
      <div className="print-brand">
        <span className="print-brand-logo">
          {lab.logoId ? <img src={`/api/media/${lab.logoId}`} alt={`Logo ${lab.name}`} /> : <BrandMark className="h-12 w-12 rounded-xl" />}
        </span>
        <div>
          <p className="print-brand-name">{lab.name}</p>
          <p className="print-brand-meta">{lab.schoolName}{lab.city ? ` · ${lab.city}` : ""}</p>
          {lab.contactPhone && <p className="print-brand-meta">Tél. {lab.contactPhone}</p>}
        </div>
      </div>
      <div className="print-document">
        <p className="print-kicker">Document officiel</p>
        <p className="print-title">{title}</p>
        {reference && <p className="print-reference">{reference}</p>}
        {subtitle && <p className="print-subtitle">{subtitle}</p>}
      </div>
    </header>
  );
}

export function PrintSection({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <section className={`print-section ${className}`}><h2 className="print-section-title">{title}</h2>{children}</section>;
}

export function PrintSignatures({ labels }: { labels: string[] }) {
  return <div className="print-sign print-avoid">{labels.map((l) => <div key={l}>{l}</div>)}</div>;
}

export function printDate(d: Date) {
  return `${fmtDate(d)} à ${fmtTime(d)}`;
}
