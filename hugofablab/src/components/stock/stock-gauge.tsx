import { cn } from "@/components/ui";

/**
 * Jauge de niveau de stock : la barre montre la quantité restante, le trait vertical marque le seuil d'alerte.
 * Vert = stock sain, jaune = sous le seuil, rouge = rupture.
 */
export function StockGauge({ quantity, minQuantity, unit, className }: { quantity: number; minQuantity: number; unit: string; className?: string }) {
  const reference = Math.max(minQuantity * 2, quantity, 1);
  const fill = Math.min(100, Math.round((quantity / reference) * 100));
  const threshold = Math.min(100, Math.round((minQuantity / reference) * 100));
  const state = quantity <= 0 ? "out" : quantity <= minQuantity ? "low" : "ok";
  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700",
            state === "ok" ? "bg-togo-green dark:bg-lime" : state === "low" ? "bg-togo-yellow" : "bg-togo-red",
          )}
          style={{ width: `${Math.max(fill, quantity > 0 ? 4 : 0)}%` }}
        />
        {minQuantity > 0 && <span className="absolute inset-y-[-2px] w-0.5 rounded-full bg-foreground/35" style={{ left: `${threshold}%` }} aria-hidden="true" />}
      </div>
      <p className="mt-1.5 text-[13px] font-bold tabular-nums text-muted-foreground">
        {quantity} {unit}
        {minQuantity > 0 && <span className="font-medium"> · seuil {minQuantity}</span>}
      </p>
    </div>
  );
}
