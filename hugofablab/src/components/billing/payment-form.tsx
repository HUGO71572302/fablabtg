"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Copy, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createPaymentRequestAction } from "@/actions/billing";
import { ImageInput } from "@/components/ui/image-input";
import { ContactButtons, whatsappNumber } from "@/components/ui/contact";
import { Alert } from "@/components/auth/auth-forms";
import { Button, Input, Label, Select, cn } from "@/components/ui";
import { BILLING_PLANS, PURCHASABLE_PLAN_LIST, formatXof, type PlanId } from "@/lib/billing-shared";

export function PaymentForm({
  defaultPlan,
  recipient,
}: {
  defaultPlan: PlanId;
  recipient: { tmoney: string; flooz: string; name: string };
}) {
  const [state, action, pending] = useActionState(createPaymentRequestAction, null);
  const [plan, setPlan] = useState<PlanId>(BILLING_PLANS[defaultPlan].availableForPurchase ? defaultPlan : "essentiel");
  const [months, setMonths] = useState(1);
  const [provider, setProvider] = useState("tmoney");
  const [copied, setCopied] = useState(false);
  const amount = BILLING_PLANS[plan].monthlyPrice * months;
  const number = provider === "flooz" ? recipient.flooz : recipient.tmoney;
  useEffect(() => { if (state?.success) toast.success("Demande envoyée", { description: state.success }); }, [state]);

  return (
    <form action={action} className="space-y-5">
      <Alert state={state} />
      <div>
        <Label>Votre formule</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {PURCHASABLE_PLAN_LIST.map((p) => (
            <label key={p.id} className={cn("relative flex cursor-pointer flex-col rounded-[18px] border p-4 transition focus-within:ring-2 focus-within:ring-togo-green/40", plan === p.id ? "border-togo-green bg-togo-green/5 ring-1 ring-togo-green dark:border-lime dark:bg-lime/5" : "border-border hover:border-togo-green/40 hover:bg-muted/50")}>
              <input type="radio" name="plan" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} className="sr-only" />
              {plan === p.id && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-togo-green text-white dark:bg-lime dark:text-forest"><Check className="h-3.5 w-3.5" /></span>}
              <div className="pr-8">
                <h3 className="text-[17px] font-extrabold tracking-tight">{p.name}</h3>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.09em] text-togo-green dark:text-lime">{p.tagline}</p>
              </div>
              <p className="mt-3 text-[13px] leading-5 text-muted-foreground">{p.description}</p>
              <ul className="mt-3 flex-1 space-y-1.5 border-t border-border/70 pt-3 text-[12px] leading-[1.35rem] text-foreground/80">
                {p.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-1 h-3 w-3 shrink-0 text-togo-green dark:text-lime" /><span>{feature}</span></li>)}
              </ul>
              <p className="mt-4 border-t border-border/70 pt-3 font-display text-[23px] font-extrabold tabular-nums tracking-tight">{formatXof(p.monthlyPrice)}<span className="ml-1 font-sans text-[11px] font-semibold tracking-normal text-muted-foreground">/ mois</span></p>
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="months">Durée</Label>
          <Select id="months" name="months" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            <option value={1}>1 mois</option><option value={3}>3 mois</option><option value={6}>6 mois</option><option value={12}>12 mois</option>
          </Select>
        </div>
        <div className="rounded-[14px] bg-lime px-4 py-3 text-forest">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em]">Total à payer</p>
          <p className="mt-1 font-display text-[24px] font-extrabold tabular-nums">{formatXof(amount)}</p>
        </div>
      </div>
      <div>
        <Label htmlFor="provider">Moyen de paiement</Label>
        <Select id="provider" name="provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="tmoney">TMoney</option><option value="flooz">Flooz</option><option value="autre">Autre Mobile Money</option>
        </Select>
      </div>
      <div className="rounded-[18px] border border-togo-green/25 bg-togo-green/5 p-4 dark:bg-lime/5">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-togo-green dark:text-lime">Étape 1 · Payez par {provider === "flooz" ? "Flooz" : provider === "tmoney" ? "TMoney" : "Mobile Money"}</p>
        <p className="mt-2 text-[14px] leading-6 text-muted-foreground">Envoyez <b className="text-foreground">{formatXof(amount)}</b> à <b className="text-foreground">{recipient.name}</b> sur ce numéro :</p>
        <div className="mt-3 flex flex-wrap items-center gap-2"><code className="rounded-xl bg-card px-3 py-2 text-[16px] font-extrabold tracking-wide text-foreground">{number}</code><button type="button" onClick={() => { navigator.clipboard?.writeText(number); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-[12px] font-bold hover:bg-card"><Copy className="h-3.5 w-3.5" />{copied ? "Copié" : "Copier"}</button><ContactButtons phone={number} compact /></div>
        <p className="mt-3 text-[12px] leading-5 text-muted-foreground">Conservez la référence affichée par l’opérateur : vous la renseignerez juste après.</p>
      </div>
      <div className="border-t border-border pt-5">
        <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Étape 2 · Demandez l'activation</p>
        <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="transactionRef">Référence Mobile Money</Label><Input id="transactionRef" name="transactionRef" required placeholder="Ex. TM123456789" /></div><div><Label htmlFor="payerPhone">Numéro ayant payé</Label><Input id="payerPhone" name="payerPhone" type="tel" placeholder="Ex. 90 00 00 00" /></div></div>
        <div className="mt-4"><ImageInput name="proof" label="Capture / preuve de paiement (facultatif mais recommandé)" hint="La capture est compressée avant envoi. Elle accélère la validation." aspect="aspect-[16/7]" /></div>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Envoyer ma demande de paiement</Button>
      <p className="text-center text-[12px] leading-5 text-muted-foreground">Envoyez votre référence une seule fois. Le responsable de la plateforme vérifie le paiement et active la formule. Si votre accès est arrivé à expiration, un délai temporaire de 3 jours est accordé pendant la vérification.</p>
    </form>
  );
}
