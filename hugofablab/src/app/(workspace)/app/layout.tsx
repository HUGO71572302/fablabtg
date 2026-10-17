import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationListener } from "@/components/system/notification-listener";
import { requireUser } from "@/lib/auth";
import { getLab, labBrand } from "@/lib/labs";
import { getSubscriptionAccess } from "@/lib/billing";
import { lastNotificationId, unreadCount } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [unread, lastId, lab, subscription] = await Promise.all([unreadCount(user.id), lastNotificationId(user.id), getLab(user.labId), getSubscriptionAccess(user.labId)]);
  const brand = lab ? labBrand(lab) : { name: "HUGO FABLAB", school: "", logoUrl: null };
  return (
    <AppShell user={{ name: user.name, role: user.role, email: user.email ?? user.username ?? "" }} unread={unread} lab={brand} subscription={{ phase: subscription.phase, plan: subscription.plan, endsAt: subscription.endsAt.toISOString(), accessAvailable: subscription.access, exempt: subscription.exempt }}>
      <NotificationListener initialLastId={lastId} />
      {children}
    </AppShell>
  );
}
