"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { stockItems, stockMovements, type StockCategory } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/media";
import { MOVEMENT_TYPES, STOCK_CATEGORIES, stockCounts, type MovementType } from "@/lib/stock";
import type { ActionState } from "./auth";
import type { SimpleResult } from "./reservations";

function revalidateAll() {
  revalidatePath("/", "layout");
}

const asCategory = (v: unknown): StockCategory => (STOCK_CATEGORIES.some((c) => c.value === v) ? (v as StockCategory) : "consommable");
const asMovementType = (v: unknown): MovementType => (MOVEMENT_TYPES.some((m) => m.value === v) ? (v as MovementType) : "ajustement");
const clean = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max) || null;

async function itemOf(id: number, labId: number) {
  const [row] = await db.select().from(stockItems).where(and(eq(stockItems.id, id), eq(stockItems.labId, labId))).limit(1);
  return row ?? null;
}

/**
 * Création ou mise à jour d'un article. Si la quantité change, un mouvement « ajustement » est journalisé :
 * le stock reste toujours traçable, même lorsqu'on corrige une valeur à la main.
 */
export async function saveStockItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(fd.get("id") || 0);
  const name = String(fd.get("name") ?? "").trim();
  const unit = String(fd.get("unit") ?? "").trim() || "unité";
  const quantity = Number(fd.get("quantity") ?? 0);
  const minQuantity = Number(fd.get("minQuantity") ?? 0);
  const values = {
    name,
    category: asCategory(fd.get("category")),
    unit,
    quantity: Number.isFinite(quantity) ? Math.max(0, Math.round(quantity)) : 0,
    minQuantity: Number.isFinite(minQuantity) ? Math.max(0, Math.round(minQuantity)) : 0,
    location: clean(fd.get("location")),
    supplier: clean(fd.get("supplier")),
    note: clean(fd.get("note"), 400),
    icon: String(fd.get("icon") ?? "box") || "box",
    updatedAt: new Date(),
  };
  if (name.length < 2) return { error: "Nom de l'article requis (2 caractères minimum)." };
  if (values.quantity > 1000000 || values.minQuantity > 1000000) return { error: "Quantité trop élevée." };

  let photoId: number | null = null;
  try {
    photoId = await saveImage(fd.get("photo"), admin.labId, 900);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Photo invalide." };
  }

  if (id) {
    const existing = await itemOf(id, admin.labId);
    if (!existing) return { error: "Article introuvable." };
    await db.update(stockItems).set({ ...values, ...(photoId ? { photoId } : {}) }).where(eq(stockItems.id, id));
    const delta = values.quantity - existing.quantity;
    if (delta !== 0) {
      await db.insert(stockMovements).values({
        labId: admin.labId,
        itemId: id,
        userId: admin.id,
        delta,
        type: "ajustement",
        note: `Inventaire corrigé (${existing.quantity} → ${values.quantity} ${unit})`,
      });
    }
    revalidateAll();
    return { success: `« ${name} » mis à jour.` };
  }

  const [created] = await db.insert(stockItems).values({ ...values, ...(photoId ? { photoId } : {}), labId: admin.labId }).returning({ id: stockItems.id });
  if (values.quantity > 0) {
    await db.insert(stockMovements).values({
      labId: admin.labId,
      itemId: created.id,
      userId: admin.id,
      delta: values.quantity,
      type: "entree",
      note: "Stock initial à la création de l'article",
    });
  }
  revalidateAll();
  return { success: `« ${name} » ajouté au stock.` };
}

/**
 * Entrée, sortie, perte ou ajustement, journalisé avec la personne connectée, le bénéficiaire
 * (élève, classe) et le motif. Le signe suit toujours le sens du mouvement.
 */
export async function adjustStockAction(
  itemId: number,
  delta: number,
  type: MovementType,
  note?: string,
  beneficiary?: string,
): Promise<SimpleResult & { quantity?: number }> {
  const admin = await requireAdmin();
  const item = await itemOf(itemId, admin.labId);
  if (!item) return { error: "Article introuvable." };
  const movementType = asMovementType(type);
  const amount = Math.round(Number(delta) || 0);
  if (!amount) return { error: "Quantité nulle : rien à enregistrer." };

  let next = item.quantity + amount;
  if (movementType !== "ajustement") {
    const sign = MOVEMENT_TYPES.find((m) => m.value === movementType)?.sign ?? 0;
    next = item.quantity + Math.abs(amount) * sign;
  }
  if (next < 0) return { error: `Stock insuffisant : il reste ${item.quantity} ${item.unit}.` };

  await db.update(stockItems).set({ quantity: next, updatedAt: new Date() }).where(eq(stockItems.id, itemId));
  await db.insert(stockMovements).values({
    labId: admin.labId,
    itemId,
    userId: admin.id,
    delta: next - item.quantity,
    type: movementType,
    note: clean(note, 200),
    beneficiary: clean(beneficiary, 120),
  });
  revalidateAll();
  return { success: `${item.name} : ${item.quantity} → ${next} ${item.unit}.`, quantity: next };
}

/** Archive l'article (il n'apparaît plus dans l'inventaire actif, son historique est conservé). */
export async function archiveStockItemAction(id: number): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const item = await itemOf(id, admin.labId);
  if (!item) return { error: "Article introuvable." };
  await db.update(stockItems).set({ active: !item.active, updatedAt: new Date() }).where(eq(stockItems.id, id));
  revalidateAll();
  return { success: item.active ? `« ${item.name} » archivé.` : `« ${item.name} » réintégré au stock.` };
}

/** Indicateurs du stock (utilisé par les composants qui se rafraîchissent côté client). */
export async function stockOverviewAction() {
  const admin = await requireAdmin();
  return stockCounts(admin.labId);
}
