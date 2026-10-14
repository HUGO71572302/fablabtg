import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { CalendarX2, Hourglass, PlusCircle } from "lucide-react";
import { db } from "@/db";
import { resources, waitlist } from "@/db/schema";
import { ReservationCard } from "@/components/reservations/reservation-card";
import { CancelReservationButton, LeaveWaitlistButton } from "@/components/reservations/student-actions";
import { EmptyState, PageHeader, buttonClass, cn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDateCompact, fmtTime } from "@/lib/dates";
import { listReservations } from "@/lib/reservations";

export const metadata: Metadata = { title: "Mes réservations" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "avenir", label: "À venir" },
  { key: "passees", label: "Passées" },
  { key: "attente", label: "Liste d'attente" },
] as const;

export default async function MyReservationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? (rawTab as (typeof TABS)[number]["key"]) : "avenir";
  const now = new Date();
  const [upcoming, past, waiting] = await Promise.all([
    listReservations({ labId: user.labId, userId: user.id, endAfter: now }),
    listReservations({ labId: user.labId, userId: user.id, endBefore: now, order: "desc", limit: 50 }),
    db
      .select({ w: waitlist, resourceName: resources.name })
      .from(waitlist)
      .innerJoin(resources, eq(waitlist.resourceId, resources.id))
      .where(and(eq(waitlist.userId, user.id), eq(waitlist.status, "active")))
      .orderBy(asc(waitlist.startAt)),
  ]);
  const counts = { avenir: upcoming.length, passees: past.length, attente: waiting.length };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Mes réservations"
        subtitle="Annulez une demande en attente ou une réservation confirmée à venir ; téléchargez votre QR code d'accès."
        action={
          <Link href="/app/reserver" className={buttonClass("primary", "md")}>
            <PlusCircle className="h-4 w-4" /> Réserver
          </Link>
        }
      />
      <div className="mb-5 flex gap-1 rounded-2xl bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/app/reservations?tab=${t.key}`}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-base font-medium",
              tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            {t.label}
            <span className="rounded-full bg-border px-1.5 text-[13px]">{counts[t.key]}</span>
          </Link>
        ))}
      </div>

      {tab === "avenir" && (
        <div className="space-y-3">
          {upcoming.length ? (
            upcoming.map((r) => (
              <ReservationCard key={r.id} r={r} actions={r.status !== "annulee" ? <CancelReservationButton id={r.id} /> : null} />
            ))
          ) : (
            <EmptyState icon={<CalendarX2 className="h-8 w-8" />} title="Aucune réservation à venir" action={<Link href="/app/reserver" className={buttonClass("primary", "md")}>Réserver un créneau</Link>} />
          )}
        </div>
      )}
      {tab === "passees" && (
        <div className="space-y-3">
          {past.length ? past.map((r) => <ReservationCard key={r.id} r={r} showQr={false} />) : <EmptyState title="Aucune réservation passée" />}
        </div>
      )}
      {tab === "attente" && (
        <div className="space-y-3">
          {waiting.length ? (
            waiting.map(({ w, resourceName }) => (
              <article key={w.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-togo-yellow/25 text-yellow-800 dark:text-yellow-200">
                    <Hourglass className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{resourceName}</p>
                    <p className="text-sm text-muted-foreground">
                      {fmtDateCompact(w.startAt)} · {fmtTime(w.startAt)} – {fmtTime(w.endAt)}
                      {w.purpose ? ` · ${w.purpose}` : ""}
                    </p>
                    <p className="mt-0.5 text-sm text-togo-green dark:text-emerald-300">Vous serez notifié(e) automatiquement si une place se libère.</p>
                  </div>
                </div>
                <LeaveWaitlistButton id={w.id} />
              </article>
            ))
          ) : (
            <EmptyState title="Aucune inscription en liste d'attente" text="Lorsqu'un créneau est complet, vous pouvez rejoindre la file d'attente depuis le formulaire de réservation." />
          )}
        </div>
      )}
    </div>
  );
}
