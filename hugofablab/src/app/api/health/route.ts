import { db, databaseConfigured, databaseInfo } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Santé publique minimale : utilisée par Vercel / les contrôles de disponibilité.
 * Diagnostic détaillé uniquement avec DEPLOYMENT_DIAGNOSTIC_TOKEN, afin de ne jamais exposer une erreur PostgreSQL au public.
 */
export async function GET(req: Request) {
  // Ne jamais accepter le jeton par URL : les query strings sont souvent copiées dans les journaux et référents.
  const token = req.headers.get("x-deployment-token");
  const detailed = Boolean(process.env.DEPLOYMENT_DIAGNOSTIC_TOKEN && token === process.env.DEPLOYMENT_DIAGNOSTIC_TOKEN);
  try {
    if (!databaseConfigured) throw new Error("DATABASE_URL is missing");
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, service: "hugo-fablab" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return Response.json(
      detailed
        ? { ok: false, code: databaseConfigured ? "database_unreachable" : "database_not_configured", database: databaseInfo(), detail: message }
        : { ok: false, code: databaseConfigured ? "database_unreachable" : "database_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
