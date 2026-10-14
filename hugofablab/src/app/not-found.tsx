import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto w-fit"><Logo /></div>
        <p className="mt-6 text-6xl font-black text-togo-green">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page introuvable</h1>
        <p className="mt-2 text-base text-muted-foreground">Cette page n'existe pas ou a été déplacée. Revenez à l'accueil du HUGO FABLAB.</p>
        <div className="tricolor mx-auto mt-6 h-1.5 w-24 rounded-full" />
        <Link href="/" className={buttonClass("primary", "lg", "mt-6")}>Retour à l'accueil</Link>
      </div>
    </div>
  );
}
