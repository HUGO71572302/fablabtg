import { WifiOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { CONTACT } from "@/lib/labels";

export const metadata = { title: "Hors ligne" };

export default function OfflinePage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto w-fit"><Logo /></div>
        <WifiOff className="mx-auto mt-6 h-12 w-12 text-togo-red" />
        <h1 className="mt-3 text-2xl font-bold">Vous êtes hors ligne</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Les pages déjà consultées peuvent rester accessibles avec leurs dernières données enregistrées. Les réservations et pointages conservés sur cet appareil seront vérifiés au retour du réseau ; ils ne sont pas confirmés avant cette synchronisation.
        </p>
        <a href="/app" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-togo-green px-6 text-base font-medium text-white">Réessayer</a>
        <p className="mt-6 text-sm text-muted-foreground">{CONTACT.place} · {CONTACT.phone}</p>
      </div>
    </div>
  );
}
