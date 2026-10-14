"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { CONTACT } from "@/lib/labels";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-togo-yellow/25 text-amber-700 dark:text-togo-yellow">
          <AlertTriangle className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-[28px] font-extrabold tracking-[-0.04em]">Cette page n&apos;a pas pu s&apos;afficher</h1>
        <p className="mt-3 text-[16px] leading-7 text-muted-foreground">
          Rien n&apos;est perdu dans la plupart des cas. Réessayez : si vous envoyiez une photo, choisissez-en une plus légère. Si cela arrive après un déploiement, le responsable doit vérifier la connexion à la base de données dans Vercel.
        </p>
        {error.digest && <p className="mt-3 font-mono text-[15px] text-muted-foreground">Réf. {error.digest}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={buttonClass("primary", "lg")}>
            <RotateCcw className="h-4 w-4" /> Réessayer
          </button>
          <Link href="/" className={buttonClass("outline", "lg")}>
            <Home className="h-4 w-4" /> Accueil
          </Link>
        </div>
        <p className="mt-8 text-base text-muted-foreground">
          Problème persistant ? Écrivez au responsable :{" "}
          <a href={`mailto:${CONTACT.email}`} className="font-bold text-togo-green underline-offset-4 hover:underline dark:text-lime">{CONTACT.email}</a>
        </p>
      </div>
    </main>
  );
}
