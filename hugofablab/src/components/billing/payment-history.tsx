import { Badge } from "@/components/ui";
import { PLAN_LABEL, formatXof } from "@/lib/billing-shared";
import { fmtDateCompact, fmtTime } from "@/lib/dates";

export type PaymentHistoryItem = {
  id: number;
  reference: string;
  labName: string;
  schoolName: string;
  requester: string | null;
  plan: string;
  months: number;
  amount: number;
  provider: string;
  transactionRef: string;
  proofId: number | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export function PaymentHistory({ payments }: { payments: PaymentHistoryItem[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-[20px] font-extrabold">Historique des paiements traités</h2>
      <p className="mt-2 text-[13px] text-muted-foreground">Demandes validées ou refusées, classées de la plus récente à la plus ancienne.</p>
      {payments.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-[14px] text-muted-foreground">Aucun paiement traité pour l&apos;instant.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {payments.map((payment) => (
            <article key={payment.id} className="rounded-[18px] border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[12px] font-bold text-togo-green dark:text-lime">{payment.reference}</p>
                  <h3 className="mt-1 text-[16px] font-extrabold">{payment.labName}</h3>
                  <p className="text-[13px] text-muted-foreground">{payment.schoolName} · demandé par {payment.requester ?? "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-display text-[18px] font-extrabold tabular-nums">{formatXof(payment.amount)}</p>
                    <p className="text-[12px] text-muted-foreground">{PLAN_LABEL[payment.plan as keyof typeof PLAN_LABEL] ?? payment.plan} · {payment.months} mois</p>
                  </div>
                  <Badge tone={payment.status === "approved" ? "green" : "red"}>{payment.status === "approved" ? "Validé" : "Refusé"}</Badge>
                </div>
              </div>
              <div className="mt-3 grid gap-2 rounded-xl bg-muted/50 p-3 text-[12px] sm:grid-cols-2">
                <p><b>Opérateur / référence</b><br />{payment.provider} · <span className="font-mono">{payment.transactionRef}</span></p>
                <p><b>Demandé</b><br />{fmtDateCompact(new Date(payment.createdAt))} à {fmtTime(new Date(payment.createdAt))}{payment.reviewedAt && <> · <b>Traité</b> le {fmtDateCompact(new Date(payment.reviewedAt))} à {fmtTime(new Date(payment.reviewedAt))}</>}</p>
              </div>
              {(payment.adminNote || payment.proofId) && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  {payment.adminNote && <p className="rounded-lg bg-muted p-2 text-[12px] text-muted-foreground">{payment.adminNote}</p>}
                  {payment.proofId && <a href={`/api/media/${payment.proofId}`} target="_blank" rel="noreferrer" className="text-[12px] font-bold text-togo-green hover:underline dark:text-lime">Voir la preuve</a>}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
