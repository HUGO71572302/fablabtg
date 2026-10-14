import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationListener } from "@/components/system/notification-listener";
import { requireAdmin } from "@/lib/auth";
import { getLab, labBrand } from "@/lib/labs";
import { getSubscriptionAccess, isPlatformAdmin } from "@/lib/billing";
import { lastNotificationId, unreadCount } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  const [unread, lastId, lab, subscription, platformAdmin] = await Promise.all([unreadCount(user.id), lastNotificationId(user.id), getLab(user.labId), getSubscriptionAccess(user.labId), isPlatformAdmin(user)]);
  const brand = lab ? labBrand(lab) : { name: "HUGO FABLAB", school: "", logoUrl: null };
  return (
    <AppShell user={{ name: user.name, role: user.role, email: user.email ?? user.username ?? "" }} unread={unread} lab={brand} subscription={{ phase: subscription.phase, endsAt: subscription.endsAt.toISOString() }} platformAdmin={platformAdmin}>
      <NotificationListener initialLastId={lastId} />
      {children}
    </AppShell>
  );
}
