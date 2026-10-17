import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/layout/auth-card";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Récupérer mon mot de passe" };
export const dynamic = "force-dynamic";

export default async function RecoverPasswordPage({ searchParams }: { searchParams: Promise<{ verified?: string; error?: string }> }) {
  const { verified, error } = await searchParams;
  const message = error === "google_unknown" || error === "google_mismatch"
    ? "Ce compte Google n’est pas reconnu pour la récupération d’un compte responsable. Essayez avec le compte Google associé à votre FabLab."
    : error
      ? "La vérification Google n’a pas abouti. Réessayez ou contactez le responsable de la plateforme."
      : null;

  return (
    <AuthCard title="Récupérer mon mot de passe" subtitle="La récupération est gratuite et vérifie votre identité avec Google.">
      {verified === "1" ? (
        <PasswordResetForm />
      ) : (
        <div className="space-y-4">
          {message && <p role="alert" className="rounded-xl bg-togo-red/10 px-4 py-3 text-sm text-togo-red">{message}</p>}
          <p className="text-sm leading-6 text-muted-foreground">Connectez-vous avec le compte Google déjà associé à votre compte responsable. Après vérification, vous pourrez choisir un nouveau mot de passe.</p>
          <Link href="/api/auth/google?flow=reset" className={buttonClass("primary", "lg", "w-full")}>Continuer avec Google</Link>
          <p className="text-center text-xs text-muted-foreground">Le lien de réinitialisation reste valable 10 minutes.</p>
          <Link href="/login" className="block text-center text-sm font-semibold text-togo-green hover:underline dark:text-emerald-300">Retour à la connexion</Link>
        </div>
      )}
    </AuthCard>
  );
}
