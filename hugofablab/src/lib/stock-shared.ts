/**
 * Définitions partagées du stock — sûres pour le navigateur (aucune requête, aucune connexion DB).
 * Les requêtes serveur vivent dans `src/lib/stock.ts`.
 */
import type { StockCategory } from "@/db/schema";

export const STOCK_CATEGORIES: { value: StockCategory; label: string; hint: string }[] = [
  { value: "consommable", label: "Consommable", hint: "Filament, colle, papier de verre, cartouche…" },
  { value: "matiere", label: "Matière première", hint: "Bois, acrylique, tissu, métal, PLA…" },
  { value: "piece", label: "Pièce détachée", hint: "Courroie, busse, roulement, carte, moteur…" },
  { value: "outillage", label: "Outillage", hint: "Mèche, foret, pince, tournevis, gabarit…" },
  { value: "securite", label: "Sécurité / EPI", hint: "Lunettes, gants, masque, protection…" },
  { value: "divers", label: "Divers", hint: "Ce qui ne rentre pas ailleurs" },
];

export const STOCK_CATEGORY_LABEL = Object.fromEntries(STOCK_CATEGORIES.map((c) => [c.value, c.label])) as Record<StockCategory, string>;

export const MOVEMENT_TYPES = [
  { value: "entree", label: "Entrée", sign: 1 },
  { value: "sortie", label: "Sortie", sign: -1 },
  { value: "perte", label: "Perte / casse", sign: -1 },
  { value: "ajustement", label: "Ajustement d'inventaire", sign: 0 },
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number]["value"];
export const MOVEMENT_LABEL = Object.fromEntries(MOVEMENT_TYPES.map((m) => [m.value, m.label])) as Record<MovementType, string>;

/** Référence lisible d'un mouvement, imprimée sur les reçus : MV-000123. */
export const movementRef = (id: number) => `MV-${String(id).padStart(6, "0")}`;
/** Référence d'un article, imprimée sur les fiches : ART-0042. */
export const itemRef = (id: number) => `ART-${String(id).padStart(4, "0")}`;

export type StockItemView = {
  id: number;
  name: string;
  category: StockCategory;
  unit: string;
  quantity: number;
  minQuantity: number;
  location: string | null;
  supplier: string | null;
  note: string | null;
  photoId: number | null;
  icon: string;
  active: boolean;
  low: boolean;
  out: boolean;
  updatedAt: string;
};

export type StockMovementView = {
  id: number;
  itemId: number;
  delta: number;
  type: MovementType;
  note: string | null;
  beneficiary: string | null;
  userName: string | null;
  createdAt: string;
};

export type StockCounts = { total: number; low: number; out: number; units: number };
