import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isLabActive } from "@/lib/labs";
import { lastNotificationId } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!(await isLabActive(user.labId))) return new Response("Lab désactivé.", { status: 403 });

  const url = new URL(req.url);
  const afterParam = Number(url.searchParams.get("after"));
  let lastId = Number.isFinite(afterParam) && afterParam > 0 ? afterParam : await lastNotificationId(user.id);

  const encoder = new TextEncoder();
  let closed = false;
  let poll: ReturnType<typeof setInterval> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const cleanup = () => {
        closed = true;
        if (poll) clearInterval(poll);
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* déjà fermé */
        }
      };

      send(`retry: 3000\n: connected ${new Date().toISOString()}\n\n`);

      const tick = async () => {
        if (closed) return;
        try {
          const rows = await db
            .select({ id: notifications.id, type: notifications.type, title: notifications.title, message: notifications.message })
            .from(notifications)
            .where(and(eq(notifications.userId, user.id), gt(notifications.id, lastId)))
            .orderBy(asc(notifications.id))
            .limit(20);
          for (const r of rows) {
            lastId = r.id;
            send(`id: ${r.id}\ndata: ${JSON.stringify(r)}\n\n`);
          }
        } catch {
          /* la base est momentanément indisponible : nouvel essai au prochain tick */
        }
      };

      poll = setInterval(tick, 2500);
      heartbeat = setInterval(() => send(": ping\n\n"), 15000);
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
      if (poll) clearInterval(poll);
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
