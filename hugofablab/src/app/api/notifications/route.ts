import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isLabActive } from "@/lib/labs";

export const dynamic = "force-dynamic";

/** Repli "polling" du flux temps réel : renvoie les notifications postérieures à ?after=ID */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ items: [] }, { status: 401 });
  if (!(await isLabActive(user.labId))) return Response.json({ items: [] }, { status: 403 });
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  const items = await db
    .select({ id: notifications.id, type: notifications.type, title: notifications.title, message: notifications.message })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), gt(notifications.id, after)))
    .orderBy(asc(notifications.id))
    .limit(20);
  return Response.json({ items });
}

/** Marque toutes les notifications de l'utilisateur comme lues. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  if (!(await isLabActive(user.labId))) return Response.json({ ok: false }, { status: 403 });
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, user.id));
  return Response.json({ ok: true });
}
