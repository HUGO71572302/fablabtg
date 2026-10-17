import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { OfflineLogoutButton } from "@/components/auth/offline-logout-button";
import { ReactivateLabButton } from "@/components/billing/reactivate-lab-button";
import { PublicHeader } from "@/components/layout/public-header";
import { Card, CardContent } from "@/components/ui";
import { requireBillingUser } from "@/lib/auth";
import { getLab } from "@/lib/labs";

export const metadata: Metadata = { title: "Lab en pause" };
export const dynamic = "force-dynamic";

export default async function DisabledLabPage() {
  const user = await requireBillingUser();
  const lab = await getLab(user.labId);
  if (!lab) redirect("/");
  if (lab.active) redirect(user.role === "fabmanager" ? "/admin" : "/app");
  const isManager = user.role === "fabmanager";

  return (
    <>
      <PublicHeader appHref={null} joinHref="/login" joinLabel="Connexion" />
      <main className="site-container grid min-h-[65vh] place-items-center py-12">
        <Card className="w-full max-w-xl">
          <CardContent className="p-6 text-center sm:p-9">
            <AlertTriangle className="mx-auto h-10 w-10 text-togo-yellow" />
            <p className="eyebrow mt-4 text-togo-green dark:text-lime">Lab mis en pause</p>
            <h1 className="mt-3 text-2xl font-extrabold">{lab.name} est en pause</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Le responsable a mis le lab en pause. La vitrine et l&apos;accès des élèves sont désactivés jusqu&apos;à sa réactivation. Les comptes, projets, réservations et autres données sont conservés.
            </p>
            {isManager ? (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <ReactivateLabButton />
                <Link href="/gestion-abonnements" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-muted">Gestion des abonnements</Link>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">Veuillez contacter le responsable de votre FabLab.</p>
            )}
            <div className="mt-5"><OfflineLogoutButton className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold hover:bg-muted">Se déconnecter</OfflineLogoutButton></div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
