import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Check, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AuthCard({ title, subtitle, children, aside }: { title: string; subtitle: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[0.94fr_1fr]">
      <aside className="relative hidden h-screen overflow-hidden bg-forest lg:sticky lg:top-0 lg:flex lg:flex-col">
        <img src="/images/makers-hero.jpg" alt="Illustration d'élèves togolais dans un atelier de fabrication" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/20 to-forest/30" />
        <div className="relative p-10"><Link href="/"><Logo light /></Link></div>
        <div className="relative mt-auto p-10 xl:p-14"><span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[13px] text-white/80"><Sparkles className="h-3.5 w-3.5 text-lime" />L&apos;atelier des possibles</span><p className="font-display text-[42px] font-extrabold leading-[1.12] tracking-[-0.045em] text-white xl:text-[50px]">Ici, on ne rêve<br />pas l&apos;avenir.<br /><span className="text-lime">On le fabrique.</span></p><p className="mt-5 max-w-sm text-[15px] leading-7 text-white/70">Un espace pour apprendre, expérimenter et partager. De la 6e à la Terminale, vos idées ont leur place.</p><div className="mt-8 flex flex-wrap gap-5 border-t border-white/15 pt-5 text-[13px] text-white/70"><span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-lime" />Sur tous vos écrans</span><span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-lime" />Simple & sécurisé</span></div></div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-5 sm:px-8"><Link href="/" className="lg:hidden"><Logo /></Link><Link href="/" className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:flex"><ArrowLeft className="h-3.5 w-3.5" />Retour à l&apos;accueil</Link><ThemeToggle /></header>
        <main className="mx-auto w-full max-w-[500px] flex-1 px-6 py-6 sm:px-10 sm:py-10"><p className="eyebrow text-togo-green dark:text-lime">Bienvenue à l&apos;atelier</p><h1 className="mt-4 text-[30px] font-extrabold tracking-[-0.045em] sm:text-[34px]">{title}</h1><p className="mb-8 mt-3 text-[15px] leading-6 text-muted-foreground">{subtitle}</p>{children}{aside}</main>
        <footer className="mx-6 flex flex-wrap justify-between gap-3 border-t border-border py-5 text-[13px] text-muted-foreground sm:mx-10"><span>HUGO FABLAB · Apprendre par le faire</span><Link href="/creer-mon-lab" className="inline-flex items-center gap-1 hover:text-togo-green dark:hover:text-lime">Vous êtes responsable ?<ArrowUpRight className="h-3 w-3" /></Link></footer>
      </div>
    </div>
  );
}
