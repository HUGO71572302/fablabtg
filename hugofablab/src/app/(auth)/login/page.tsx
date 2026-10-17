import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/layout/auth-card";
import { LoginForm } from "@/components/auth/auth-forms";
import { DemoAccounts } from "@/components/auth/demo-accounts";
import { getCurrentUser } from "@/lib/auth";
import { googleOAuthConfigServer } from "@/lib/origin";
import { CopyField } from "@/components/ui/copy-field";

export const metadata: Metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "fabmanager" ? "/admin" : "/app");
  const { error } = await searchParams;
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const googleConfig = await googleOAuthConfigServer();
  const mismatch = error === "google" || error === "google_token" || error === "google_mismatch";
  return (
    <AuthCard
      title="Connexion"
      subtitle="Élèves et membres externes : identifiant + code PIN. Responsables : e-mail + mot de passe."
      aside={
        <>
          {error && (
            <div className="mt-4 space-y-3 rounded-2xl border border-dashed border-togo-red/50 bg-togo-red/5 p-4 text-sm text-foreground">
              <p className="font-bold text-togo-red">
                {error === "google_unknown"
                  ? "Aucun compte responsable n'est associé à cette adresse Google. Créez d'abord votre lab ou connectez-vous avec votre e-mail."
                  : mismatch
                    ? "Google a refusé l'URI de redirection (redirect_uri_mismatch)."
                    : "Connexion Google impossible. Réessayez ou utilisez votre identifiant."}
              </p>
              {mismatch && (
                <>
                  <p className="text-[13px] leading-6 text-muted-foreground">Dans Google Cloud Console → Identifiants → votre client OAuth Web, ajoutez exactement cette URI dans « Authorized redirect URIs » :</p>
                  <CopyField label="URI Google à autoriser" value={googleConfig.redirectUri} />
                  <p className="text-[12px] leading-5 text-muted-foreground">Les URL d&apos;aperçu changent parfois. Sur un domaine final, configurez la variable <code>GOOGLE_REDIRECT_URI</code> une seule fois.</p>
                </>
              )}
            </div>
          )}
          <DemoAccounts />
        </>
      }
    >
      <LoginForm googleEnabled={googleEnabled} />
    </AuthCard>
  );
}
