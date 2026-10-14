/** Requêtes serveur du stock : inventaire, journal des mouvements, synthèse, fiches et reçus. */
import { and, asc, desc, eq, gte, lt, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { stockItems, stockMovements, users, type StockCategory, type StockItem, type StockMovement } from "@/db/schema";
import { addDays, dayKey } from "@/lib/dates";
import { MOVEMENT_TYPES, type MovementType, type StockCounts, type StockItemView, type StockMovementView } from "@/lib/stock-shared";

export * from "@/lib/stock-shared";

export type JournalFilter = { labId: number; from?: string; to?: string; type?: MovementType | "all"; itemId?: number; limit?: number };
export type JournalRow = StockMovementView & { itemId: number; itemName: string; itemUnit: string; itemCategory: StockCategory };
export type ReceiptRow = JournalRow & { balanceBefore: number; balanceAfter: number };
export type LedgerLine = StockMovementView & { balance: number };
export type SummaryRow = {
  itemId: number;
  name: string;
  unit: string;
  category: StockCategory;
  current: number;
  entrees: number;
  sorties: number;
  pertes: number;
  ajustements: number;
  net: number;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export function validDay(v?: string): string | undefined {
  if (!v || !DAY_RE.test(v)) return undefined;
  return Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) ? undefined : v;
}
const startOf = (day: string) => new Date(`${day}T00:00:00Z`);
const shift = (day: string, n: number) => dayKey(addDays(startOf(day), n));

/** Traduit les paramètres d'URL en filtre de journal (périodes rapides ou dates libres). */
export function journalFilter(labId: number, sp: Record<string, string | undefined>): JournalFilter {
  const today = dayKey(new Date());
  const periode = sp.periode ?? "mois";
  let from = validDay(sp.from);
  let to = validDay(sp.to);
  if (!from && !to && periode !== "tout") {
    to = today;
    from = periode === "jour" ? today : periode === "semaine" ? shift(today, -6) : shift(today, -29);
  }
  const type = MOVEMENT_TYPES.some((m) => m.value === sp.type) ? (sp.type as MovementType) : "all";
  const itemId = Number(sp.item) > 0 ? Number(sp.item) : undefined;
  return { labId, from, to, type, itemId };
}

function conditions(f: JournalFilter): SQL[] {
  const c: SQL[] = [eq(stockMovements.labId, f.labId)];
  if (f.from) c.push(gte(stockMovements.createdAt, startOf(f.from)));
  if (f.to) c.push(lt(stockMovements.createdAt, startOf(shift(f.to, 1))));
  if (f.type && f.type !== "all") c.push(eq(stockMovements.type, f.type));
  if (f.itemId) c.push(eq(stockMovements.itemId, f.itemId));
  return c;
}

function toItemView(i: StockItem): StockItemView {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    unit: i.unit,
    quantity: i.quantity,
    minQuantity: i.minQuantity,
    location: i.location,
    supplier: i.supplier,
    note: i.note,
    photoId: i.photoId,
    icon: i.icon,
    active: i.active,
    out: i.quantity <= 0,
    low: i.quantity > 0 && i.quantity <= i.minQuantity,
    updatedAt: i.updatedAt.toISOString(),
  };
}

function toMovementView(m: StockMovement, userName: string | null): StockMovementView {
  return {
    id: m.id,
    itemId: m.itemId,
    delta: m.delta,
    type: (m.type as MovementType) ?? "ajustement",
    note: m.note,
    beneficiary: m.beneficiary ?? null,
    userName,
    createdAt: m.createdAt.toISOString(),
  };
}

/** Tous les articles d'un lab (archivés exclus par défaut). */
export async function listStock(labId: number, includeInactive = false): Promise<StockItemView[]> {
  const rows = await db
    .select()
    .from(stockItems)
    .where(includeInactive ? eq(stockItems.labId, labId) : and(eq(stockItems.labId, labId), eq(stockItems.active, true)))
    .orderBy(asc(stockItems.category), asc(stockItems.name));
  return rows.map(toItemView);
}

/** Articles à surveiller : en rupture ou sous le seuil d'alerte. */
export async function stockAlerts(labId: number, limit = 6): Promise<StockItemView[]> {
  const rows = await db
    .select()
    .from(stockItems)
    .where(and(eq(stockItems.labId, labId), eq(stockItems.active, true), sql`${stockItems.quantity} <= ${stockItems.minQuantity}`))
    .orderBy(asc(stockItems.quantity))
    .limit(limit);
  return rows.map(toItemView);
}

export async function getStockItem(id: number, labId: number): Promise<StockItemView | null> {
  const [row] = await db.select().from(stockItems).where(and(eq(stockItems.id, id), eq(stockItems.labId, labId))).limit(1);
  return row ? toItemView(row) : null;
}

/** Derniers mouvements (article donné ou tout le lab). */
export async function listMovements(opts: { labId: number; itemId?: number; limit?: number }): Promise<StockMovementView[]> {
  const rows = await db
    .select({ m: stockMovements, userName: users.name })
    .from(stockMovements)
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .where(opts.itemId ? and(eq(stockMovements.labId, opts.labId), eq(stockMovements.itemId, opts.itemId)) : eq(stockMovements.labId, opts.labId))
    .orderBy(desc(stockMovements.id))
    .limit(opts.limit ?? 40);
  return rows.map(({ m, userName }) => toMovementView(m, userName));
}

/** Journal complet filtrable : entrées, sorties, pertes et ajustements de tous les articles. */
export async function listJournal(f: JournalFilter): Promise<JournalRow[]> {
  const rows = await db
    .select({ m: stockMovements, itemName: stockItems.name, itemUnit: stockItems.unit, itemCategory: stockItems.category, userName: users.name })
    .from(stockMovements)
    .innerJoin(stockItems, eq(stockMovements.itemId, stockItems.id))
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .where(and(...conditions(f)))
    .orderBy(desc(stockMovements.id))
    .limit(f.limit ?? 500);
  return rows.map(({ m, itemName, itemUnit, itemCategory, userName }) => ({
    ...toMovementView(m, userName),
    itemId: m.itemId,
    itemName,
    itemUnit,
    itemCategory,
  }));
}

/** Bilan par article sur la période : entrées, sorties, pertes, ajustements et solde actuel. */
export async function journalSummary(f: JournalFilter): Promise<SummaryRow[]> {
  const rows = await db
    .select({
      itemId: stockMovements.itemId,
      name: stockItems.name,
      unit: stockItems.unit,
      category: stockItems.category,
      current: stockItems.quantity,
      entrees: sql<number>`coalesce(sum(${stockMovements.delta}) filter (where ${stockMovements.type} = 'entree'), 0)`,
      sorties: sql<number>`coalesce(-sum(${stockMovements.delta}) filter (where ${stockMovements.type} = 'sortie'), 0)`,
      pertes: sql<number>`coalesce(-sum(${stockMovements.delta}) filter (where ${stockMovements.type} = 'perte'), 0)`,
      ajustements: sql<number>`coalesce(sum(${stockMovements.delta}) filter (where ${stockMovements.type} = 'ajustement'), 0)`,
      net: sql<number>`coalesce(sum(${stockMovements.delta}), 0)`,
    })
    .from(stockMovements)
    .innerJoin(stockItems, eq(stockMovements.itemId, stockItems.id))
    .where(and(...conditions({ ...f, type: "all" })))
    .groupBy(stockMovements.itemId, stockItems.name, stockItems.unit, stockItems.category, stockItems.quantity)
    .orderBy(asc(stockItems.category), asc(stockItems.name));
  return rows.map((r) => ({
    ...r,
    current: Number(r.current),
    entrees: Number(r.entrees),
    sorties: Number(r.sorties),
    pertes: Number(r.pertes),
    ajustements: Number(r.ajustements),
    net: Number(r.net),
  }));
}

/** Reçu d'un mouvement, avec le solde de l'article avant et après l'opération. */
export async function getReceipt(labId: number, movementId: number): Promise<ReceiptRow | null> {
  const [row] = await db
    .select({ m: stockMovements, itemName: stockItems.name, itemUnit: stockItems.unit, itemCategory: stockItems.category, userName: users.name })
    .from(stockMovements)
    .innerJoin(stockItems, eq(stockMovements.itemId, stockItems.id))
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .where(and(eq(stockMovements.id, movementId), eq(stockMovements.labId, labId)))
    .limit(1);
  if (!row) return null;
  const [{ bal }] = await db
    .select({ bal: sql<number>`coalesce(sum(${stockMovements.delta}), 0)` })
    .from(stockMovements)
    .where(and(eq(stockMovements.itemId, row.m.itemId), lte(stockMovements.id, movementId)));
  const after = Number(bal);
  return {
    ...toMovementView(row.m, row.userName),
    itemId: row.m.itemId,
    itemName: row.itemName,
    itemUnit: row.itemUnit,
    itemCategory: row.itemCategory,
    balanceAfter: after,
    balanceBefore: after - row.m.delta,
  };
}

/** Fiche article : tous les mouvements dans l'ordre, avec le solde courant après chaque ligne. */
export async function getItemLedger(labId: number, itemId: number): Promise<{ item: StockItemView; lines: LedgerLine[]; balance: number } | null> {
  const item = await getStockItem(itemId, labId);
  if (!item) return null;
  const rows = await db
    .select({ m: stockMovements, userName: users.name })
    .from(stockMovements)
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .where(and(eq(stockMovements.labId, labId), eq(stockMovements.itemId, itemId)))
    .orderBy(asc(stockMovements.id));
  let balance = 0;
  const lines: LedgerLine[] = rows.map(({ m, userName }) => {
    balance += m.delta;
    return { ...toMovementView(m, userName), balance };
  });
  return { item, lines, balance };
}

/** Consommation (sorties + pertes) par jour sur les 7 derniers jours, pour le graphe du tableau de bord. */
export async function consumptionLastDays(labId: number, days = 7): Promise<{ label: string; value: number }[]> {
  const now = new Date();
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1 - i)));
    return {
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
      label: ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"][d.getUTCDay()],
      value: 0,
    };
  });
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${stockMovements.createdAt}), 'YYYY-MM-DD')`,
      total: sql<number>`sum(abs(${stockMovements.delta}))`,
    })
    .from(stockMovements)
    .where(and(eq(stockMovements.labId, labId), sql`${stockMovements.delta} < 0`, sql`${stockMovements.createdAt} >= now() - make_interval(days => ${days})`))
    .groupBy(sql`1`);
  for (const r of rows) {
    const bucket = buckets.find((b) => b.key === r.day);
    if (bucket) bucket.value = Number(r.total ?? 0);
  }
  return buckets;
}

export async function stockCounts(labId: number): Promise<StockCounts> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      low: sql<number>`count(*) filter (where ${stockItems.quantity} > 0 and ${stockItems.quantity} <= ${stockItems.minQuantity})`,
      out: sql<number>`count(*) filter (where ${stockItems.quantity} <= 0)`,
      units: sql<number>`coalesce(sum(${stockItems.quantity}), 0)`,
    })
    .from(stockItems)
    .where(and(eq(stockItems.labId, labId), eq(stockItems.active, true)));
  return { total: Number(row?.total ?? 0), low: Number(row?.low ?? 0), out: Number(row?.out ?? 0), units: Number(row?.units ?? 0) };
}

export type { StockCategory, StockCounts, StockItemView, StockMovementView };
