import type { Metadata } from "next";
import { PaymentReview, type PendingPayment } from "@/components/billing/payment-review";
import { PaymentHistory, type PaymentHistoryItem } from "@/components/billing/payment-history";
import { PublicHeader } from "@/components/layout/public-header";
import { PageHeader, Stat } from "@/components/ui";
import { requirePlatformAdmin } from "@/lib/auth";
import { listPaymentHistory, listPendingPayments } from "@/lib/billing";

export const metadata: Metadata = { title: "Gestion des abonnements" };
export const dynamic = "force-dynamic";

export default async function PlatformBillingPage() {
  await requirePlatformAdmin();
  const [pendingRows, historyRows] = await Promise.all([listPendingPayments(), listPaymentHistory()]);
  const payments: PendingPayment[] = pendingRows.map(({ request, labName, schoolName, requester }) => ({ ...request, createdAt: request.createdAt.toISOString(), labName, schoolName, requester }));
  const history: PaymentHistoryItem[] = historyRows.map(({ request, labName, schoolName, requester }) => ({
    id: request.id,
    reference: request.reference,
    labName,
    schoolName,
    requester,
    plan: request.plan,
    months: request.months,
    amount: request.amount,
    provider: request.provider,
    transactionRef: request.transactionRef,
    proofId: request.proofId,
    status: request.status,
    adminNote: request.adminNote,
    createdAt: request.createdAt.toISOString(),
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
  }));
  return (
    <>
      <PublicHeader appHref="/gestion-abonnements" joinHref="/gestion-abonnements" joinLabel="Gestion" />
      <main className="site-container pb-16 pt-8">
        <PageHeader eyebrow="Plateforme" title="Gestion des abonnements" subtitle="Validation manuelle des références Mobile Money. C’est le mode de réactivation le plus simple et gratuit : vérifiez le SMS de paiement, puis activez le lab." />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Stat label="À valider" value={payments.length} hint="preuves Mobile Money" accent="yellow" />
          <Stat label="Validation" value="1 clic" hint="active le lab immédiatement" accent="green" />
          <Stat label="Frais d’API" value="0" hint="validation humaine" accent="neutral" />
          <Stat label="Support" value="24 h" hint="accès de courtoisie possible" accent="red" />
        </div>
        <div className="mt-7"><PaymentReview payments={payments} /></div>
        <PaymentHistory payments={history} />
      </main>
    </>
  );
}
