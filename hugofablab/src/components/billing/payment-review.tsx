"use client";

import { useState, useTransition } from "react";
import { Check, Clock3, ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { grantCourtesyAccessAction, reviewPaymentAction } from "@/actions/billing";
import { ContactButtons } from "@/components/ui/contact";
import { openImageViewer } from "@/components/system/image-viewer";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { PLAN_LABEL, formatXof } from "@/lib/billing-shared";

export type PendingPayment = { id: number; labId: number; labName: string; schoolName: string; requester: string | null; plan: string; months: number; amount: number; provider: string; payerPhone: string | null; transactionRef: string; proofId: number | null; reference: string; createdAt: string };

/** Validation manuelle, sans coût d'API : une fois le Mobile Money vérifié, l'accès est immédiatement réactivé. */
export function PaymentReview({ payments }: { payments: PendingPayment[] }) {
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [pending, start] = useTransition();
  const review = (id: number, decision: "approve" | "reject") => start(async () => {
    const r = await reviewPaymentAction(id, decision, notes[id]);
    if (r.error) toast.error(r.error); else toast.success(r.success);
  });
  const grant = (labId: number) => start(async () => {
    const r = await grantCourtesyAccessAction(labId, 1, "Accès de courtoisie en attente de paiement");
    if (r.error) toast.error(r.error); else toast.success(r.success);
  });

  if (!payments.length) return <div className="rounded-[18px] border border-dashed border-border p-8 text-center text-[14px] text-muted-foreground"><ShieldCheck className="mx-auto mb-3 h-7 w-7 text-togo-green dark:text-lime" />Aucune demande Mobile Money à valider.</div>;
  return <div className="space-y-4">{payments.map((p) => <article key={p.id} className="rounded-[18px] border border-border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-[12px] font-bold text-togo-green dark:text-lime">{p.reference}</p><h3 className="mt-1 text-[17px] font-extrabold">{p.labName}</h3><p className="text-[13px] text-muted-foreground">{p.schoolName} · demandé par {p.requester ?? "—"}</p></div><div className="text-right"><p className="font-display text-[22px] font-extrabold tabular-nums">{formatXof(p.amount)}</p><p className="text-[12px] text-muted-foreground">{PLAN_LABEL[p.plan as keyof typeof PLAN_LABEL] ?? p.plan} · {p.months} mois</p></div></div><div className="mt-4 grid gap-3 rounded-[14px] bg-muted/50 p-3 text-[13px] sm:grid-cols-3"><p><b>Opérateur</b><br />{p.provider}</p><p><b>Réf. opérateur</b><br /><span className="font-mono font-bold">{p.transactionRef}</span></p><p><b>N° payeur</b><br />{p.payerPhone ?? "—"} {p.payerPhone && <ContactButtons phone={p.payerPhone} compact />}</p></div>{p.proofId && <button type="button" onClick={() => openImageViewer(`/api/media/${p.proofId}`, `Preuve de paiement ${p.reference}`, "preuves")} className="mt-3 inline-flex items-center gap-2 text-[13px] font-bold text-togo-green hover:underline dark:text-lime"><ExternalLink className="h-4 w-4" /> Voir la preuve de paiement</button>}<div className="mt-4"><Label htmlFor={`note-${p.id}`}>Note interne (optionnelle)</Label><Textarea id={`note-${p.id}`} value={notes[p.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))} className="min-h-[60px]" placeholder="Ex. Paiement reçu le…" /></div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="success" disabled={pending} onClick={() => review(p.id, "approve")}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Valider et activer</Button><Button type="button" variant="outline" className="text-togo-red" disabled={pending} onClick={() => review(p.id, "reject")}><X className="h-4 w-4" /> Refuser</Button><Button type="button" variant="ghost" disabled={pending} onClick={() => grant(p.labId)}><Clock3 className="h-4 w-4" /> Accès 24 h gratuit</Button></div></article>)}</div>;
}
