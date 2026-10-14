import type { Metadata } from "next";
import Link from "next/link";
import { AdminReservationItem } from "@/components/admin/reservation-item";
import { EmptyState, PageHeader, cn } from "@/components/ui";
import type { ReservationStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings, listReservations, listResourcesWithRooms } from "@/lib/reservations";

export const metadata: Metadata = { title: "Réservations" };
export const dynamic = "force-dynamic";

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "a_venir", label: "À venir" },
  { key: "en_attente", label: "En attente" },
  { key: "confirmee", label: "Confirmées" },
  { key: "annulee", label: "Annulées" },
  { key: "passees", label: "Passées" },
  { key: "toutes", label: "Toutes" },
];

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; resource?: string; focus?: string }>;
}) {
  const admin = await requireAdmin();
  const { status = "a_venir", resource, focus } = await searchParams;
  const now = new Date();
  const resourceId = resource ? Number(resource) : undefined;
  const [settings, allResources] = await Promise.all([getSettings(admin.labId), listResourcesWithRooms(admin.labId)]);
  let list;
  if (status === "a_venir") list = await listReservations({ labId: admin.labId, endAfter: now, notStatus: "annulee", resourceId });
  else if (status === "passees") list = await listReservations({ labId: admin.labId, endBefore: now, order: "desc", resourceId, limit: 200 });
  else if (status === "toutes") list = await listReservations({ labId: admin.labId, order: "desc", resourceId, limit: 300 });
  else list = await listReservations({ labId: admin.labId, status: status as ReservationStatus, order: status === "annulee" ? "desc" : "asc", resourceId, limit: 300 });
  const resourceOptions = allResources.map((r) => ({ id: r.id, name: r.name, type: r.type, maxDurationMinutes: r.maxDurationMinutes }));
  const focusId = focus ? Number(focus) : 0;
  const qs = (s: string, r?: number) => `/admin/reservations?status=${s}${r ? `&resource=${r}` : ""}`;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Toutes les réservations" subtitle="Validez, modifiez ou annulez n'importe quelle réservation. Chaque action notifie l'utilisateur en temps réel." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-muted p-1">
          {STATUS_TABS.map((t) => (
            <Link key={t.key} href={qs(t.key, resourceId)} className={cn("whitespace-nowrap rounded-xl px-3 py-1.5 text-base font-medium", status === t.key ? "bg-card shadow-sm" : "text-muted-foreground")}>
              {t.label}
            </Link>
          ))}
        </div>
        <form className="ml-auto" method="get">
          <input type="hidden" name="status" value={status} />
          <select name="resource" defaultValue={resourceId ?? 0} className="rounded-xl border border-border bg-card px-3 py-2 text-base">
            <option value={0}>Toutes les ressources</option>
            {allResources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button type="submit" className="ml-2 rounded-xl border border-border px-3 py-2 text-base hover:bg-muted">Filtrer</button>
        </form>
      </div>
      <p className="mb-3 text-base text-muted-foreground">{list.length} réservation(s)</p>
      <div className="space-y-3">
        {list.length ? (
          list.map((r) => <AdminReservationItem key={r.id} r={r} resources={resourceOptions} settings={settings} highlight={r.id === focusId} />)
        ) : (
          <EmptyState title="Aucune réservation dans cette vue" />
        )}
      </div>
    </div>
  );
}
