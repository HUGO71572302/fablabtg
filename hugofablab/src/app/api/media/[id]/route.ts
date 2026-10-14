import { eq } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Sert les images téléversées (logos, couvertures, machines, projets). Un média n'est jamais modifié : cache long. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return new Response("Not found", { status: 404 });
  const [m] = await db.select({ mime: media.mime, data: media.data }).from(media).where(eq(media.id, n)).limit(1);
  if (!m) return new Response("Not found", { status: 404 });
  const buf = Buffer.from(m.data, "base64");
  return new Response(buf, {
    headers: {
      "Content-Type": m.mime,
      "Content-Length": String(buf.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
