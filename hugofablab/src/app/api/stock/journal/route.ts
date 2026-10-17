import { getCurrentUser } from "@/lib/auth";
import { isLabActive } from "@/lib/labs";
import { dayKey } from "@/lib/dates";
import { journalFilter, listJournal, movementRef, MOVEMENT_LABEL, STOCK_CATEGORY_LABEL } from "@/lib/stock";

export const dynamic = "force-dynamic";

/** Export CSV du journal (séparateur « ; », encodage UTF-8 avec BOM : Excel l'ouvre correctement). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "fabmanager" || !user.labId) return new Response("Accès réservé au responsable du lab.", { status: 403 });
  if (!(await isLabActive(user.labId))) return new Response("Lab désactivé.", { status: 403 });
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const rows = await listJournal({ ...journalFilter(user.labId, params), limit: 10000 });
  const esc = (v: unknown) => {
    const value = String(v ?? "");
    // Prevent user-controlled labels, notes, and beneficiaries from becoming Excel formulas.
    const safe = typeof v === "number" || !/^[\u0000-\u0020]*[=+\-@]/.test(value) ? value : `'${value}`;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const header = ["Référence", "Date", "Heure", "Article", "Catégorie", "Type", "Quantité", "Unité", "Remis à", "Enregistré par", "Motif"];
  const body = rows.map((r) => {
    const d = new Date(r.createdAt);
    return [
      movementRef(r.id),
      d.toISOString().slice(0, 10),
      d.toISOString().slice(11, 16),
      r.itemName,
      STOCK_CATEGORY_LABEL[r.itemCategory],
      MOVEMENT_LABEL[r.type],
      r.delta,
      r.itemUnit,
      r.beneficiary ?? "",
      r.userName ?? "Système",
      r.note ?? "",
    ];
  });
  const csv = "\uFEFF" + [header, ...body].map((line) => line.map(esc).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-stock-${dayKey(new Date())}.csv"`,
    },
  });
}
