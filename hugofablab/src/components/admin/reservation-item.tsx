import { ReservationCard } from "@/components/reservations/reservation-card";
import { ReservationAdminActions, type AdminResourceOption } from "@/components/admin/reservation-actions";
import type { LabSettings } from "@/db/schema";
import { dayKey, fmtTimeInput } from "@/lib/dates";
import type { ReservationView } from "@/lib/reservations";

export function AdminReservationItem({
  r,
  resources,
  settings,
  highlight = false,
}: {
  r: ReservationView;
  resources: AdminResourceOption[];
  settings: Pick<LabSettings, "openTime" | "closeTime" | "slotStepMinutes">;
  highlight?: boolean;
}) {
  return (
    <div id={`reservation-${r.id}`} className={highlight ? "rounded-2xl ring-2 ring-togo-yellow" : undefined}>
      <ReservationCard
        r={r}
        showUser
        showQr={false}
        actions={
          <ReservationAdminActions
            reservation={{
              id: r.id,
              status: r.status,
              resourceId: r.resource.id,
              date: dayKey(r.startAt),
              start: fmtTimeInput(r.startAt),
              duration: Math.round((r.endAt.getTime() - r.startAt.getTime()) / 60000),
              note: r.adminNote,
              checkedIn: Boolean(r.checkedInAt),
              isPast: r.endAt.getTime() < Date.now(),
            }}
            resources={resources}
            settings={{ openTime: settings.openTime, closeTime: settings.closeTime, slotStepMinutes: settings.slotStepMinutes }}
          />
        }
      />
    </div>
  );
}
