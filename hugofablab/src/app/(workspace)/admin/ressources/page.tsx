import type { Metadata } from "next";
import { ResourceEditor, ResourceStatusButtons } from "@/components/admin/resource-editor";
import { ResourceIcon } from "@/components/ui/resource-icon";
import { EmptyState, LevelBadge, PageHeader, ResourceStatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { mediaUrl } from "@/lib/media-url";
import { listResourcesWithRooms } from "@/lib/reservations";

export const metadata: Metadata = { title: "Machines & salles" };
export const dynamic = "force-dynamic";

type LabResource = Awaited<ReturnType<typeof listResourcesWithRooms>>[number];

function ResourceSection({ title, items, roomOptions }: {
  title: string;
  items: LabResource[];
  roomOptions: { id: number; name: string }[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">
        {title} <span className="text-base font-normal text-muted-foreground">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <EmptyState title={`Aucune ${title === "Machines" ? "machine" : "salle"} enregistrée`} text="Utilisez « Nouvelle ressource » pour l&apos;ajouter avec sa photo." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((r) => {
            const photo = mediaUrl(r.photoId);
            return (
              <article key={r.id} className={`overflow-hidden rounded-2xl border border-border bg-card ${r.status === "desactivee" ? "opacity-70" : ""}`}>
                <div className="flex gap-3 p-4">
                  {photo ? (
                    <img src={photo} alt={r.name} data-gallery={r.type === "machine" ? "machines" : "salles"} className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-16 w-16 sm:h-20 sm:w-20 shrink-0 place-items-center rounded-xl bg-muted"><ResourceIcon icon={r.icon} className="h-8 w-8" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-[15px] font-semibold">{r.name}</p>
                      <ResourceEditor
                        trigger="icon"
                        rooms={roomOptions}
                        initial={{
                          id: r.id,
                          type: r.type,
                          name: r.name,
                          category: r.category,
                          description: r.description,
                          status: r.status,
                          requiredLevel: r.requiredLevel,
                          capacity: r.capacity,
                          maxDurationMinutes: r.maxDurationMinutes,
                          roomId: r.roomId,
                          icon: r.icon,
                          photoUrl: photo,
                        }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {r.category}
                      {r.roomName ? ` · ${r.roomName}` : ""} · {r.capacity > 1 ? `${r.capacity} places` : "1 poste"} · max {r.maxDurationMinutes} min
                    </p>
                    {r.description && <p className="mt-1 line-clamp-2 text-base text-muted-foreground">{r.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.type === "machine" && <LevelBadge level={r.requiredLevel} />}
                      <ResourceStatusBadge status={r.status} />
                    </div>
                  </div>
                </div>
                <div className="border-t border-border px-4 py-3">
                  <ResourceStatusButtons id={r.id} name={r.name} type={r.type} status={r.status} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default async function AdminResourcesPage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const admin = await requireAdmin();
  const { bienvenue } = await searchParams;
  const all = await listResourcesWithRooms(admin.labId);
  const rooms = all.filter((r) => r.type === "salle");
  const machines = all.filter((r) => r.type === "machine");
  const roomOptions = rooms.map((r) => ({ id: r.id, name: r.name }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Machines & salles"
        subtitle="Enregistrez ce que contient réellement votre lab : nom, photo, capacité, niveau requis. Les élèves ne voient que les ressources de votre lab."
        action={<ResourceEditor rooms={roomOptions} />}
      />
      {bienvenue && (
        <div className="rounded-2xl border-l-4 border-togo-yellow bg-togo-yellow/10 p-4 text-base">
          🎉 <b>Votre FabLab est créé !</b> Étape suivante : ajoutez vos salles puis vos machines avec leur photo. Partagez ensuite le lien d&apos;inscription
          (menu <b>Identité du lab</b>) à vos élèves.
        </div>
      )}
      <ResourceSection title="Machines" items={machines} roomOptions={roomOptions} />
      <ResourceSection title="Salles" items={rooms} roomOptions={roomOptions} />
    </div>
  );
}
