import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { CheckCheck } from "lucide-react";
import { markAllReadAction } from "@/actions/admin";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { EmptyState, PageHeader, buttonClass, cn } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fmtDateCompact, fmtTime, timeAgo } from "@/lib/dates";
import { NOTIF_META } from "@/lib/labels";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const rows = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.id)).limit(100);
  const unread = rows.filter((n) => !n.read).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} non lue(s)` : "Tout est à jour"}
        action={
          unread ? (
            <form action={markAllReadAction}>
              <button type="submit" className={buttonClass("outline", "md")}>
                <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
              </button>
            </form>
          ) : null
        }
      />
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id} className={cn("flex gap-3 rounded-2xl border border-border bg-card p-4", !n.read && "border-l-4 border-l-togo-green")}>
              <span className="text-2xl leading-none">{NOTIF_META[n.type].emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{n.title}</p>
                <p className="text-base text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {timeAgo(n.createdAt)} · {fmtDateCompact(n.createdAt)} {fmtTime(n.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Aucune notification" text="Vous recevrez ici les confirmations, modifications et annulations de vos réservations." />
      )}
    </div>
  );
}
