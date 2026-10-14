import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ContactButtons } from "@/components/ui/contact";
import { CONTACT } from "@/lib/labels";

export function PublicFooter() {
  return (
    <footer id="contact" className="bg-forest text-white">
      <div className="site-container grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr] sm:py-16">
        <div><Link href="/"><Logo light /></Link><p className="mt-5 max-w-xs text-[15px] leading-7 text-white/70">Des idées, des mains, des machines.<br />Et toute une génération qui apprend à créer.</p><span className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-lime"><MapPin className="h-3.5 w-3.5" /> Né à Dapaong. Ouvert à toutes les écoles.</span></div>
        <div><p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">Les possibles</p><div className="grid gap-3 text-[15px]"><Link href="/#labs" className="hover:text-lime">Découvrir les FabLabs</Link><Link href="/register" className="hover:text-lime">Créer mon compte élève</Link><Link href="/creer-mon-lab" className="inline-flex items-center gap-2 hover:text-lime">Inscrire mon établissement<ArrowUpRight className="h-3.5 w-3.5" /></Link><Link href="/login" className="hover:text-lime">Accéder à mon espace</Link></div></div>
        <div><p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">On reste en contact</p><div className="grid gap-4 text-[15px]"><a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-2.5 break-all hover:text-lime"><Mail className="h-4 w-4 shrink-0 text-lime" />{CONTACT.email}</a><div className="flex flex-wrap items-center gap-3"><a href={`tel:${CONTACT.phoneIntl}`} className="inline-flex items-center gap-2.5 hover:text-lime"><Phone className="h-4 w-4 text-lime" />{CONTACT.phone}</a><ContactButtons phone={CONTACT.phone} email={CONTACT.email} /></div><p className="text-[13px] text-white/70">{CONTACT.manager}<br />Enseignant référent & FabManager</p></div></div>
      </div>
      <div className="site-container"><div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-5 text-[13px] text-white/70"><span>© {new Date().getFullYear()} HUGO FABLAB. Apprendre par le faire.</span><span className="flex items-center gap-2"><span className="tricolor h-2 w-5 rounded-sm" />Conçu au Togo, pour les talents de demain.</span></div></div>
    </footer>
  );
}
