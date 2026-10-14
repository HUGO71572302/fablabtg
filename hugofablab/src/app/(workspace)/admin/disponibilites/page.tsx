import type { Metadata } from "next";
import { and, asc, eq, gt } from "drizzle-orm";
import { CalendarOff, Save, Trash2 } from "lucide-react";
import { addClosureAction, deleteClosureAction, saveSettingsAction } from "@/actions/admin";
import { db } from "@/db";
import { closures } from "@/db/schema";
import { Card, CardContent, CardHeader, Input, Label, PageHeader, Select, Textarea, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { DAY_NAMES, dayKey, fmtDateCompact, fmtTime } from "@/lib/dates";
import { getSettings, listResourcesWithRooms } from "@/lib/reservations";

export const metadata: Metadata = { title: "Disponibilités" };
export const dynamic = "force-dynamic";

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const admin = await requireAdmin();
  const { saved, error } = await searchParams;
  const [settings, resources, upcoming] = await Promise.all([
    getSettings(admin.labId),
    listResourcesWithRooms(admin.labId),
    db.select().from(closures).where(and(eq(closures.labId, admin.labId), gt(closures.endAt, new Date()))).orderBy(asc(closures.startAt)),
  ]);
  const openDays = settings.openDays.split(",").map(Number);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Disponibilités" subtitle="Horaires d'ouverture, règles de réservation, jours fermés et maintenances." />
      {saved && <p className="rounded-xl bg-togo-green/10 px-4 py-2 text-base text-togo-green dark:text-emerald-300">✅ Modifications enregistrées.</p>}
      {error && <p className="rounded-xl bg-togo-red/10 px-4 py-2 text-base text-togo-red">❌ Dates invalides : la fin doit être après le début.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Horaires & règles" subtitle="Appliqués à toutes les nouvelles réservations." />
          <CardContent>
            <form action={saveSettingsAction} className="space-y-4">
              <div>
                <Label>Jours d'ouverture</Label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <label key={d} className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-base has-[:checked]:border-togo-green has-[:checked]:bg-togo-green/10">
                      <input type="checkbox" name={`day_${d}`} defaultChecked={openDays.includes(d)} className="accent-togo-green" />
                      {DAY_NAMES[d].slice(0, 3)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="openTime">Ouverture</Label>
                  <Input id="openTime" type="time" name="openTime" defaultValue={settings.openTime} step={900} required />
                </div>
                <div>
                  <Label htmlFor="closeTime">Fermeture</Label>
                  <Input id="closeTime" type="time" name="closeTime" defaultValue={settings.closeTime} step={900} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="slotStepMinutes">Pas (min)</Label>
                  <Select id="slotStepMinutes" name="slotStepMinutes" defaultValue={settings.slotStepMinutes}>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={60}>60</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="maxDurationMinutes">Durée max (min)</Label>
                  <Input id="maxDurationMinutes" type="number" name="maxDurationMinutes" min={30} step={15} defaultValue={settings.maxDurationMinutes} />
                </div>
                <div>
                  <Label htmlFor="maxActiveReservations">Résa actives max</Label>
                  <Input id="maxActiveReservations" type="number" name="maxActiveReservations" min={1} defaultValue={settings.maxActiveReservations} />
                </div>
              </div>
              <div>
                <Label htmlFor="announcement">Annonce affichée aux utilisateurs</Label>
                <Textarea id="announcement" name="announcement" defaultValue={settings.announcement ?? ""} />
              </div>
              <button type="submit" className={buttonClass("primary", "md")}>
                <Save className="h-4 w-4" /> Enregistrer
              </button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Ajouter une fermeture / maintenance" subtitle="Bloque les réservations sur la période, pour tout le FabLab ou une ressource." />
            <CardContent>
              <form action={addClosureAction} className="space-y-3">
                <div>
                  <Label htmlFor="resourceId">Portée</Label>
                  <Select id="resourceId" name="resourceId" defaultValue={0}>
                    <option value={0}>🏫 Tout le FabLab (jour fermé)</option>
                    <optgroup label="Machines">
                      {resources.filter((r) => r.type === "machine").map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </optgroup>
                    <optgroup label="Salles">
                      {resources.filter((r) => r.type === "salle").map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </optgroup>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="date">Du</Label>
                    <Input id="date" type="date" name="date" defaultValue={dayKey(new Date())} required />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Au (inclus)</Label>
                    <Input id="endDate" type="date" name="endDate" />
                  </div>
                  <div>
                    <Label htmlFor="startTime">De</Label>
                    <Input id="startTime" type="time" name="startTime" defaultValue="00:00" />
                  </div>
                  <div>
                    <Label htmlFor="endTime">À</Label>
                    <Input id="endTime" type="time" name="endTime" defaultValue="23:59" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="reason">Motif</Label>
                  <Input id="reason" name="reason" placeholder="Ex. Jour férié, maintenance laser, examens…" required />
                </div>
                <button type="submit" className={buttonClass("warning", "md")}>
                  <CalendarOff className="h-4 w-4" /> Ajouter
                </button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Fermetures à venir" />
            <CardContent>
              {upcoming.length ? (
                <ul className="space-y-2">
                  {upcoming.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2 text-base">
                      <div>
                        <p className="font-medium">{c.resourceId ? resources.find((r) => r.id === c.resourceId)?.name ?? "Ressource" : "Tout le FabLab"}</p>
                        <p className="text-sm text-muted-foreground">
                          {c.reason} · {fmtDateCompact(c.startAt)} {fmtTime(c.startAt)} → {fmtDateCompact(c.endAt)} {fmtTime(c.endAt)}
                        </p>
                      </div>
                      <form action={deleteClosureAction.bind(null, c.id)}>
                        <button type="submit" aria-label="Supprimer" className="rounded-lg p-2 text-muted-foreground hover:bg-togo-red/10 hover:text-togo-red">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base text-muted-foreground">Aucune fermeture planifiée.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
