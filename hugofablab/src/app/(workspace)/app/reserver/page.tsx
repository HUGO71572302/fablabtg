import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSkills } from "@/db/schema";
import { ReservationForm, type FormResource } from "@/components/reservations/reservation-form";
import { Card, CardContent, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { mediaUrl } from "@/lib/media-url";
import { levelAllows, maxLevel } from "@/lib/labels";
import { getSettings, listResourcesWithRooms } from "@/lib/reservations";

export const metadata: Metadata = { title: "Réserver" };
export const dynamic = "force-dynamic";

export default async function ReservePage({ searchParams }: { searchParams: Promise<{ resource?: string }> }) {
  const user = await requireUser();
  const { resource } = await searchParams;
  const [settings, resources, skills] = await Promise.all([
    getSettings(user.labId),
    listResourcesWithRooms(user.labId),
    db.select().from(userSkills).where(eq(userSkills.userId, user.id)),
  ]);
  const admin = user.role === "fabmanager";
  const formResources: FormResource[] = resources
    .filter((r) => r.status !== "desactivee")
    .map((r) => {
      const skill = skills.find((s) => s.resourceId === r.id);
      const userLevel = skill ? maxLevel(user.autonomyLevel, skill.level) : user.autonomyLevel;
      return {
        id: r.id,
        photoUrl: mediaUrl(r.photoId),
        icon: r.icon,
        name: r.name,
        type: r.type,
        category: r.category,
        status: r.status,
        requiredLevel: r.requiredLevel,
        capacity: r.capacity,
        maxDurationMinutes: r.maxDurationMinutes,
        roomName: r.roomName,
        userLevel,
        allowed: admin || levelAllows(userLevel, r.requiredLevel),
      };
    });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Réserver un créneau" subtitle="Choisissez une machine ou une salle, une date et une durée. La disponibilité est vérifiée en direct." />
      <Card>
        <CardContent className="pt-5">
          <ReservationForm
            resources={formResources}
            settings={{
              openTime: settings.openTime,
              closeTime: settings.closeTime,
              slotStepMinutes: settings.slotStepMinutes,
              maxDurationMinutes: settings.maxDurationMinutes,
              openDays: settings.openDays.split(",").map(Number),
            }}
            defaultResourceId={resource ? Number(resource) : undefined}
            today={dayKey(new Date())}
            isAdmin={admin}
            userId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
