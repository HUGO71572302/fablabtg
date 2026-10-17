import { eq } from "drizzle-orm";
import { db } from "@/db";
import { media, paymentRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/billing";

export const dynamic = "force-dynamic";

/** Sert les images téléversées (logos, couvertures, machines, projets). Un média n'est jamais modifié : cache long. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return new Response("Not found", { status: 404 });
  const [m] = await db.select({ mime: media.mime, data: media.data }).from(media).where(eq(media.id, n)).limit(1);
  if (!m) return new Response("Not found", { status: 404 });

  // Les justificatifs Mobile Money peuvent contenir des données financières privées.
  const [proof] = await db.select({ labId: paymentRequests.labId }).from(paymentRequests).where(eq(paymentRequests.proofId, n)).limit(1);
  let cacheControl = "public, max-age=31536000, immutable";
  if (proof) {
    const user = await getCurrentUser();
    const platformAdmin = user ? await isPlatformAdmin(user) : false;
    const ownsLab = user?.role === "fabmanager" && user.labId === proof.labId;
    if (!ownsLab && !platformAdmin) return new Response("Not found", { status: 404 });
    cacheControl = "private, no-store";
  }

  const buf = Buffer.from(m.data, "base64");
  return new Response(buf, {
    headers: {
      "Content-Type": m.mime,
      "Content-Length": String(buf.length),
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
