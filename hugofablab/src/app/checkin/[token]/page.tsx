import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { CheckCircle2, Clock3, MapPinCheck, XCircle } from "lucide-react";
import { db } from "@/db";
import { reservations } from "@/db/schema";
import { Logo } from "@/components/brand/logo";
import { ReservationCard } from "@/components/reservations/reservation-card";
import { buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { fmtTime } from "@/lib/dates";
import { isLabActive } from "@/lib/labs";
import { getReservationView, notify } from "@/lib/reservations";

export const metadata: Metadata = { title: "Pointage" };
export const dynamic = "force-dynamic";

export default async function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  const [row] = await db.select({ id: reservations.id }).from(reservations).where(eq(reservations.qrToken, token)).limit(1);
  let view = row ? await getReservationView(row.id) : null;
  let justChecked = false;
  let message: { tone: "ok" | "warn" | "err"; text: string } | null = null;

  if (view && !(await isLabActive(view.resource.labId))) {
    view = null;
    message = { tone: "err", text: "Ce FabLab est en pause. Le pointage est temporairement indisponible." };
  } else if (!view) {
    message = { tone: "err", text: "QR code invalide ou réservation introuvable." };
  } else if (user?.role === "fabmanager" && view.resource.labId === user.labId) {
    if (view.status !== "confirmee") message = { tone: "warn", text: `Réservation ${view.status === "annulee" ? "annulée" : "non confirmée"} : pointage impossible.` };
    else if (view.checkedInAt) message = { tone: "ok", text: `Présence déjà pointée à ${fmtTime(view.checkedInAt)}.` };
    else {
      await db.update(reservations).set({ checkedInAt: new Date(), updatedAt: new Date() }).where(eq(reservations.id, view.id));
      await notify(view.user.id, "presence", "📍 Présence pointée", `Bienvenue au FabLab ! Présence enregistrée pour ${view.resource.name}.`, view.id);
      view = await getReservationView(view.id);
      justChecked = true;
      message = { tone: "ok", text: `Présence de ${view?.user.name} enregistrée. Bon atelier !` };
    }
  } else {
    message = { tone: "warn", text: "Présentez ce QR code au FabManager : seul son compte peut valider la présence." };
  }

  const Icon = message?.tone === "ok" ? (justChecked ? MapPinCheck : CheckCircle2) : message?.tone === "warn" ? Clock3 : XCircle;
  const color = message?.tone === "ok" ? "text-togo-green dark:text-emerald-300" : message?.tone === "warn" ? "text-yellow-600" : "text-togo-red";

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6">
      <Link href="/" className="mb-8 self-start"><Logo /></Link>
      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
        {message && <Icon className={`mx-auto h-14 w-14 ${color}`} />}
        <h1 className="mt-3 text-2xl font-bold">Pointage de présence</h1>
        {message && <p className={`mt-1 text-base ${color}`}>{message.text}</p>}
      </div>
      {view && (
        <div className="mt-4">
          <ReservationCard r={view} showUser showQr={false} />
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href={user ? (user.role === "fabmanager" ? "/admin" : "/app") : "/login"} className={buttonClass("primary", "md")}>
          {user ? "Retour à mon espace" : "Se connecter"}
        </Link>
      </div>
    </div>
  );
}
