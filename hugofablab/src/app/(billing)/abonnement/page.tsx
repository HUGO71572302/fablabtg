import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, HelpCircle, Sparkles } from "lucide-react";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentRequests } from "@/db/schema";
import { PaymentForm } from "@/components/billing/payment-form";
import { SubscriptionStatus } from "@/components/billing/subscription-status";
import { PublicHeader } from "@/components/layout/public-header";
import { ContactButtons } from "@/components/ui/contact";
import { Badge, Card, CardContent, CardHeader, buttonClass } from "@/components/ui";
import { requireBillingUser } from "@/lib/auth";
import { BILLING_PLANS, PLAN_LIST, formatXof, getSubscriptionAccess, paymentRecipient } from "@/lib/billing";
import { fmtDateCompact, fmtTime } from "@/lib/dates";
import { getLab } from "@/lib/labs";
import { mediaUrl } from "@/lib/media-url";

export const metadata: Metadata = { title: "Abonnement du lab" };
export const dynamic = "force-dynamic";

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const user = await requireBillingUser();
  const { reason } = await searchParams;
  const [lab, access, payments] = await Promise.all([
    getLab(user.labId),
    getSubscriptionAccess(user.labId),
    db.select().from(paymentRequests).where(eq(paymentRequests.labId, user.labId)).orderBy(desc(paymentRequests.id)),
  ]);
  if (!lab) return null;
  const recipient = paymentRecipient();
  const defaultPlan = access.plan;
  return <><PublicHeader appHref={access.access ? (user.role === "fabmanager" ? "/admin" : "/app") : null} joinHref="/abonnement" joinLabel="Mon abonnement" /><main className="site-container pb-16 pt-8 sm:pt-12"><Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-togo-green dark:hover:text-lime"><ArrowLeft className="h-3 w-3" />Accueil</Link><div className="mt-8 grid gap-7 xl:grid-cols-[0.9fr_1.25fr]"><div><p className="eyebrow text-togo-green dark:text-lime">Accès du lab</p><h1 className="mt-4 text-[34px] font-extrabold leading-tight tracking-[-0.045em]">Gardons l&apos;atelier ouvert.</h1><p className="mt-4 max-w-md text-[16px] leading-7 text-muted-foreground">{lab.name} profite de toutes les fonctionnalités pendant l&apos;essai gratuit. Après l&apos;essai, choisissez une formule et réactivez simplement via Mobile Money.</p><div className="mt-6"><SubscriptionStatus phase={access.phase} plan={access.plan} endsAt={access.endsAt.toISOString()} /></div>{reason && !access.access && <p className="mt-4 rounded-xl border border-togo-red/30 bg-togo-red/5 p-3 text-[14px] text-togo-red">L&apos;accès complet du lab est momentanément suspendu. Envoyez votre demande de paiement ci-contre pour le réactiver.</p>}<div className="mt-6 rounded-[18px] border border-border bg-card p-5"><p className="text-[13px] font-extrabold">Réactivation simple et sans API payante</p><ol className="mt-3 space-y-2 text-[13px] leading-6 text-muted-foreground"><li><b className="text-foreground">1.</b> Payez via TMoney ou Flooz.</li><li><b className="text-foreground">2.</b> Envoyez votre référence et une capture facultative.</li><li><b className="text-foreground">3.</b> L&apos;administrateur valide : le lab est réactivé, sans frais de passerelle.</li></ol><div className="mt-4 flex items-center gap-2"><ContactButtons phone={recipient.tmoney} compact /><span className="text-[12px] text-muted-foreground">Besoin d&apos;aide pour la validation ? Contactez-nous.</span></div></div></div><div><Card><CardHeader eyebrow="Choisir et réactiver" title="Payer par Mobile Money" subtitle="Le montant est calculé automatiquement selon la formule et la durée."/><CardContent><PaymentForm defaultPlan={defaultPlan} recipient={recipient} /></CardContent></Card></div></div><section className="mt-10"><h2 className="text-[20px] font-extrabold">Historique de vos abonnements</h2><p className="mt-2 text-[13px] text-muted-foreground">Retrouvez toutes les demandes envoyées et les décisions de validation.</p>{payments.length === 0?<p className="mt-3 text-[14px] text-muted-foreground">Aucune demande pour l&apos;instant.</p>:<div className="mt-4 grid gap-3 md:grid-cols-2">{payments.map((p)=> <Card key={p.id}><CardContent className="pt-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[12px] font-bold text-togo-green dark:text-lime">{p.reference}</p><p className="mt-1 text-[15px] font-extrabold">{BILLING_PLANS[p.plan as keyof typeof BILLING_PLANS]?.name ?? p.plan} · {p.months} mois</p><p className="mt-1 text-[13px] text-muted-foreground">Réf. opérateur : {p.transactionRef}</p></div><Badge tone={p.status === "approved" ? "green" : p.status === "rejected" ? "red" : "yellow"}>{p.status === "approved" ? "Validé" : p.status === "rejected" ? "Refusé" : "À valider"}</Badge></div>{p.proofId && <img src={mediaUrl(p.proofId)!} data-gallery="preuves" alt={`Preuve de paiement ${p.reference}`} className="mt-3 h-20 w-20 rounded-xl object-cover" />}{p.adminNote && <p className="mt-3 rounded-lg bg-muted p-2 text-[12px] text-muted-foreground">{p.adminNote}</p>}<p className="mt-3 text-[11px] text-muted-foreground">Envoyée le {fmtDateCompact(p.createdAt)} · {fmtTime(p.createdAt)}</p></CardContent></Card>)}</div>}</section><section className="mt-12"><p className="eyebrow text-togo-green dark:text-lime">Les formules</p><h2 className="mt-3 text-[28px] font-extrabold tracking-[-0.04em]">Choisissez le rythme de votre lab.</h2><div className="mt-6 grid gap-4 md:grid-cols-3">{PLAN_LIST.map(p=><Card key={p.id} className={p.id === "plus" ? "border-togo-green ring-1 ring-togo-green/20" : ""}><CardContent className="pt-5"><p className="text-[18px] font-extrabold">{p.name}</p><p className="mt-1 text-[13px] text-muted-foreground">{p.accent}</p><p className="mt-4 font-display text-[26px] font-extrabold">{formatXof(p.monthlyPrice)}<span className="ml-1 text-[12px] font-medium text-muted-foreground">/ mois</span></p><ul className="mt-4 space-y-2">{p.features.map(f=><li key={f} className="flex gap-2 text-[13px] text-muted-foreground"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-togo-green dark:text-lime"/>{f}</li>)}</ul></CardContent></Card>)}</div></section></main></>;
}
