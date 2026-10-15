import type { Level, NotificationType, ReservationStatus, ResourceStatus, Role } from "@/db/schema";

export const LEVELS: Level[] = ["debutant", "confirme", "expert"];
export const LEVEL_RANK: Record<Level, number> = { debutant: 0, confirme: 1, expert: 2 };
export const LEVEL_LABEL: Record<Level, string> = { debutant: "Débutant", confirme: "Confirmé", expert: "Expert" };
export const LEVEL_EMOJI: Record<Level, string> = { debutant: "🌱", confirme: "🔧", expert: "🏅" };

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  annulee: "Annulée",
};
export const RESOURCE_STATUS_LABEL: Record<ResourceStatus, string> = {
  disponible: "Disponible",
  maintenance: "En maintenance",
  desactivee: "Désactivée",
};
export const ROLE_LABEL: Record<Role, string> = { student: "Élève", external: "Externe", fabmanager: "FabManager" };

export const NOTIF_META: Record<NotificationType, { emoji: string; tone: "success" | "info" | "error" | "warning" | "default" }> = {
  confirmee: { emoji: "✅", tone: "success" },
  modifiee: { emoji: "✏️", tone: "info" },
  annulee: { emoji: "❌", tone: "error" },
  en_attente: { emoji: "⏳", tone: "warning" },
  liste_attente: { emoji: "🎉", tone: "success" },
  presence: { emoji: "📍", tone: "info" },
  niveau: { emoji: "🏅", tone: "success" },
  info: { emoji: "ℹ️", tone: "default" },
};

export const ICON_OPTIONS = [
  { value: "printer", label: "Imprimante 3D" },
  { value: "laser", label: "Découpe laser" },
  { value: "cnc", label: "CNC / Usinage" },
  { value: "electronics", label: "Électronique" },
  { value: "robot", label: "Robotique" },
  { value: "vinyl", label: "Découpe vinyle" },
  { value: "sewing", label: "Textile / Couture" },
  { value: "computer", label: "Informatique" },
  { value: "room", label: "Salle" },
  { value: "wrench", label: "Outillage" },
];

export const CONTACT = {
  email: "hkabrame@gmail.com",
  phone: "96 93 38 93",
  phoneIntl: "+22896933893",
  manager: "Atissoli KABRAME",
  managerTitle: "FabManager & Enseignant Référent",
  place: "Lycée Nassablé de Dapaong",
  region: "Région des Savanes, Togo",
};

export function maxLevel(a: Level, b: Level): Level {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}
export function levelAllows(userLevel: Level, required: Level) {
  return LEVEL_RANK[userLevel] >= LEVEL_RANK[required];
}

/** Niveaux scolaires couverts par le FabLab (collège + lycée). */
export const CLASS_LEVELS = [
  { value: "6e", label: "6e" },
  { value: "5e", label: "5e" },
  { value: "4e", label: "4e" },
  { value: "3e", label: "3e" },
  { value: "2nde", label: "Seconde" },
  { value: "1re", label: "Première" },
  { value: "Tle", label: "Terminale" },
] as const;
export const CLASS_LABEL: Record<string, string> = Object.fromEntries(CLASS_LEVELS.map((c) => [c.value, c.label]));
export function classLabel(level: string | null | undefined, section?: string | null) {
  if (!level) return section ?? "";
  return `${CLASS_LABEL[level] ?? level}${section ? ` ${section}` : ""}`;
}
