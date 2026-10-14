import { Bot, Cog, Cpu, DoorOpen, Monitor, Printer, Scissors, Shirt, Wrench, Zap, type LucideProps } from "lucide-react";

const MAP = {
  printer: Printer,
  laser: Zap,
  cnc: Cog,
  electronics: Cpu,
  robot: Bot,
  vinyl: Scissors,
  sewing: Shirt,
  computer: Monitor,
  room: DoorOpen,
  wrench: Wrench,
} as const;

export function ResourceIcon({ icon, ...props }: { icon: string } & LucideProps) {
  const Cmp = MAP[icon as keyof typeof MAP] ?? Wrench;
  return <Cmp {...props} />;
}
