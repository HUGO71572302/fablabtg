import { Box, Boxes, CircuitBoard, Cpu, Droplet, Hammer, Lightbulb, Package, Ruler, Scissors, ShieldCheck, Wrench, Zap, type LucideProps } from "lucide-react";

const MAP = {
  box: Box,
  boxes: Boxes,
  package: Package,
  material: Ruler,
  filament: Droplet,
  tool: Hammer,
  wrench: Wrench,
  scissors: Scissors,
  electronics: CircuitBoard,
  chip: Cpu,
  light: Lightbulb,
  energy: Zap,
  safety: ShieldCheck,
} as const;

export const STOCK_ICONS = [
  { value: "box", label: "Carton / stock" },
  { value: "boxes", label: "Bacs de rangement" },
  { value: "package", label: "Colis / paquet" },
  { value: "material", label: "Matière (plaque, tube)" },
  { value: "filament", label: "Filament / liquide" },
  { value: "tool", label: "Outillage à main" },
  { value: "wrench", label: "Maintenance" },
  { value: "scissors", label: "Découpe" },
  { value: "electronics", label: "Électronique" },
  { value: "chip", label: "Carte / composant" },
  { value: "light", label: "Éclairage / LED" },
  { value: "energy", label: "Énergie / câblage" },
  { value: "safety", label: "Sécurité / EPI" },
] as const;

export function StockIcon({ icon, ...props }: { icon: string } & LucideProps) {
  const Cmp = MAP[icon as keyof typeof MAP] ?? Box;
  return <Cmp {...props} />;
}
