import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Palette, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { Reveal } from "@/components/motion";
import { LabSignupForm } from "@/components/auth/lab-signup-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Créer mon FabLab" };
export const dynamic = "force-dynamic";

export default async function CreateLabPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "fabmanager" ? "/admin" : "/app");
  return <><PublicHeader /><main className="mx-auto max-w-[1050px] px-5 pb-16 pt-8 sm:px-8 sm:pt-12"><Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"><ArrowLeft className="h-3 w-3" />Retour au réseau</Link><div className="mb-8 mt-8 grid items-center gap-7 md:grid-cols-[1fr_auto]"><Reveal variant="group"><p className="eyebrow text-togo-green dark:text-lime">Un atelier à votre image</p><h1 className="mt-4 text-[32px] font-extrabold leading-tight tracking-[-0.045em] sm:text-[40px]">Le prochain FabLab,<br />c&apos;est le vôtre.</h1><p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground">Donnez une identité à votre atelier, puis ajoutez vos vraies machines. Vos élèves de la 6e à la Terminale pourront le rejoindre et réserver en quelques gestes.</p><p className="mt-3 inline-flex items-center gap-2 rounded-full bg-lime px-3 py-2 text-[12px] font-bold text-forest">🎁 30 jours d&apos;accès complet offertes dès la création</p></Reveal><Reveal variant="left" delay={150} className="rounded-[20px] border border-border bg-card p-5 text-sm"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lime text-forest"><Palette className="h-4 w-4" /></span><span>Votre identité, vos photos.</span></div><div className="mt-4 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-togo-green dark:text-lime"><ShieldCheck className="h-4 w-4" /></span><span>Un espace propre à votre lab.</span></div></Reveal></div><Reveal variant="up" delay={200} className="rounded-[24px] border border-border bg-card p-5 surface-shadow sm:p-8"><LabSignupForm requireCode={Boolean(process.env.LAB_CREATION_CODE)} /></Reveal><p className="mt-5 flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground"><Check className="h-3 w-3 text-togo-green dark:text-lime" />Logo et photos facultatifs : vous pourrez les ajouter plus tard.</p></main></>;
}
